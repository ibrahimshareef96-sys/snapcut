// visiontool: Apple Vision helpers for snapcut (runs on-device, nothing leaves the Mac).
//
//   visiontool faces IMAGE
//       -> JSON [{x,y,w,h}] face boxes in pixels, top-left origin, largest first.
//   visiontool matte VIDEO START DUR OUT_W OUT_H
//       -> raw gray8 person-segmentation mattes (OUT_W x OUT_H, one per source frame
//          in [START, START+DUR)) written to stdout; pipe into ffmpeg -f rawvideo.
//          Uses VNGeneratePersonSegmentationRequest (.accurate) on one sequence handler
//          so Vision's temporal smoothing applies across frames.
//   visiontool facetrack VIDEO START DUR
//       -> JSON lines {t, x, y, w, h} (pixels in the oriented frame, top-left origin)
//          for the largest face in each frame, or {t, none:true}.
import AVFoundation
import CoreImage
import Foundation
import Vision

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(2)
}

// preferredTransform is expressed in top-left coordinates; CIImage is bottom-left, so map the
// transform to an EXIF orientation and let Core Image apply it (iPhone portrait = .right).
func orientation(of t: CGAffineTransform) -> CGImagePropertyOrientation {
    switch (t.a, t.b, t.c, t.d) {
    case (0, 1, -1, 0): return .right
    case (0, -1, 1, 0): return .left
    case (-1, 0, 0, -1): return .down
    default: return .up
    }
}

func orientedImage(_ buffer: CVPixelBuffer, _ transform: CGAffineTransform) -> CIImage {
    let img = CIImage(cvPixelBuffer: buffer).oriented(orientation(of: transform))
    return img.transformed(by: CGAffineTransform(translationX: -img.extent.origin.x,
                                                 y: -img.extent.origin.y))
}

func openReader(_ path: String, _ start: Double, _ dur: Double) -> (AVAssetReader, AVAssetReaderTrackOutput, CGAffineTransform) {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    guard let track = asset.tracks(withMediaType: .video).first else { fail("no video track") }
    guard let reader = try? AVAssetReader(asset: asset) else { fail("cannot open reader") }
    let out = AVAssetReaderTrackOutput(track: track, outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    ])
    out.alwaysCopiesSampleData = false
    reader.add(out)
    reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600),
                                   duration: CMTime(seconds: dur, preferredTimescale: 600))
    guard reader.startReading() else { fail("startReading failed: \(String(describing: reader.error))") }
    return (reader, out, track.preferredTransform)
}

func faces(_ path: String) {
    guard let img = CIImage(contentsOf: URL(fileURLWithPath: path)) else { fail("cannot read \(path)") }
    let req = VNDetectFaceRectanglesRequest()
    try? VNImageRequestHandler(ciImage: img, options: [:]).perform([req])
    let W = img.extent.width, H = img.extent.height
    let boxes = (req.results ?? []).map { f -> [String: Int] in
        let b = f.boundingBox
        return ["x": Int(b.minX * W), "y": Int((1 - b.maxY) * H), "w": Int(b.width * W), "h": Int(b.height * H)]
    }.sorted { ($0["w"]! * $0["h"]!) > ($1["w"]! * $1["h"]!) }
    let data = try! JSONSerialization.data(withJSONObject: boxes)
    print(String(data: data, encoding: .utf8)!)
}

/* The reader must stay alive for the whole read and must end in .completed; anything else means the
   output stopped early (a partial matte), so fail loudly instead of returning success. */
func finish(_ reader: AVAssetReader, _ frames: Int) {
    if reader.status != .completed {
        fail("video reader stopped early after \(frames) frames: status \(reader.status.rawValue), \(String(describing: reader.error))")
    }
}

func matte(_ path: String, _ start: Double, _ dur: Double, _ outW: Int, _ outH: Int) {
    let (reader, out, transform) = openReader(path, start, dur)
    let seq = VNSequenceRequestHandler()
    let req = VNGeneratePersonSegmentationRequest()
    req.qualityLevel = .accurate
    req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    let ctx = CIContext(options: [.workingColorSpace: NSNull()])
    var bytes = [UInt8](repeating: 0, count: outW * outH)
    let stdout = FileHandle.standardOutput
    var n = 0
    while let sample = out.copyNextSampleBuffer(), let buf = CMSampleBufferGetImageBuffer(sample) {
        let img = orientedImage(buf, transform)
        do { try seq.perform([req], on: img) } catch { fail("vision: \(error)") }
        guard let mask = req.results?.first?.pixelBuffer else { fail("no mask at frame \(n)") }
        var m = CIImage(cvPixelBuffer: mask)
        m = m.transformed(by: CGAffineTransform(scaleX: CGFloat(outW) / m.extent.width,
                                                y: CGFloat(outH) / m.extent.height))
        ctx.render(m, toBitmap: &bytes, rowBytes: outW, bounds: CGRect(x: 0, y: 0, width: outW, height: outH),
                   format: .L8, colorSpace: nil)
        stdout.write(Data(bytes))
        n += 1
    }
    finish(reader, n)
    FileHandle.standardError.write("matte frames: \(n)\n".data(using: .utf8)!)
}

func facetrack(_ path: String, _ start: Double, _ dur: Double) {
    let (reader, out, transform) = openReader(path, start, dur)
    var n = 0
    while let sample = out.copyNextSampleBuffer(), let buf = CMSampleBufferGetImageBuffer(sample) {
        n += 1
        let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
        let img = orientedImage(buf, transform)
        let req = VNDetectFaceRectanglesRequest()
        do { try VNImageRequestHandler(ciImage: img, options: [:]).perform([req]) } catch { fail("vision at \(t): \(error)") }
        let W = img.extent.width, H = img.extent.height
        if let f = (req.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width }) {
            let b = f.boundingBox
            print("{\"t\":\(t),\"x\":\(Int(b.minX * W)),\"y\":\(Int((1 - b.maxY) * H)),\"w\":\(Int(b.width * W)),\"h\":\(Int(b.height * H))}")
        } else {
            print("{\"t\":\(t),\"none\":true}")
        }
    }
    finish(reader, n)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: visiontool faces IMAGE | matte VIDEO START DUR W H | facetrack VIDEO START DUR") }
switch args[1] {
case "faces": faces(args[2])
case "matte":
    guard args.count == 7, let s = Double(args[3]), let d = Double(args[4]), let w = Int(args[5]), let h = Int(args[6])
    else { fail("usage: visiontool matte VIDEO START DUR W H") }
    matte(args[2], s, d, w, h)
case "facetrack":
    guard args.count == 5, let s = Double(args[3]), let d = Double(args[4]) else { fail("usage: visiontool facetrack VIDEO START DUR") }
    facetrack(args[2], s, d)
default: fail("unknown command \(args[1])")
}

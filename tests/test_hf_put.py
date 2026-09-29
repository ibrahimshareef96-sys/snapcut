import pytest

import hf_put

URL = "https://upload.higgsfield.ai/some/presigned/path?sig=abc"


@pytest.fixture
def refs(tmp_path):
    (tmp_path / "face.jpg").write_bytes(b"\xff\xd8\xff")
    (tmp_path / "drive.mp4").write_bytes(b"\x00")
    (tmp_path / "notes.txt").write_text("private")
    return tmp_path


def test_image_and_video_are_accepted(refs):
    assert hf_put.check("face.jpg", URL, refs) == (refs / "face.jpg").resolve()
    assert hf_put.check("drive.mp4", URL, refs) == (refs / "drive.mp4").resolve()


@pytest.mark.parametrize("name,url", [
    ("notes.txt", URL),                                              # not an image or a video
    ("../face.jpg", URL),                                            # outside the folder
    ("missing.jpg", URL),                                            # no such file
    ("face.jpg", "http://upload.higgsfield.ai/x"),                  # not https
    ("face.jpg", "https://evil.example/x"),                         # another host
    ("face.jpg", "https://upload.higgsfield.ai.evil.example/x"),    # look-alike host
    ("face.jpg", "https://user:pw@upload.higgsfield.ai/x"),         # credentials in the URL
    ("face.jpg", "https://upload.higgsfield.ai:8443/x"),            # another port
    (3, URL),                                                        # not a string
])
def test_refused(refs, name, url):
    with pytest.raises(ValueError):
        hf_put.check(name, url, refs)

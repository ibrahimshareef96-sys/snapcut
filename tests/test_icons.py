import pytest

import icons

LUCIDE_SUN = """<!-- @license lucide-static v1.48.0 - ISC -->
<svg class="lucide lucide-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /></svg>"""


def test_plain_icon_with_licence_comment_is_accepted():
    assert icons.check_svg(LUCIDE_SUN, "sun") == LUCIDE_SUN


def test_internal_reference_is_accepted():
    svg = '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="a"/></defs><use href="#a"/></svg>'
    assert icons.check_svg(svg, "use")


@pytest.mark.parametrize("svg", [
    '<svg><script>alert(1)</script></svg>',
    '<svg><x:script xmlns:x="http://www.w3.org/2000/svg">a</x:script></svg>',
    '<svg><x:foreignObject/></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><image xlink:href="file:///etc/passwd"/></svg>',
    '<svg><image href="https://attacker.example/p.png"/></svg>',
    '<svg><style>@import url(https://attacker.example/x.css)</style></svg>',
    '<svg><a href="&#106;avascript:alert(1)">x</a></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
    '<html><body>not an svg</body></html>',
])
def test_unsafe_or_non_svg_is_refused(svg):
    with pytest.raises(SystemExit):
        icons.check_svg(svg, "bad")


def test_oversized_svg_is_refused():
    with pytest.raises(SystemExit):
        icons.check_svg("<svg>" + " " * (icons.MAX_BYTES + 1) + "</svg>", "big")


@pytest.mark.parametrize("spec", [
    {"lucide": "terminal", "fill": "#34D07F"},
    {"brand": "claude"},
    {"file": "assets/logo.svg", "fill": None},
])
def test_valid_specs(spec):
    assert icons.spec_of("x", spec) == spec


@pytest.mark.parametrize("spec", [
    {},                                              # nothing to fetch
    {"lucide": "a", "brand": "b"},                   # two sources
    {"lucide": "../../etc/passwd"},                  # path traversal in the cache name
    {"lucide": "terminal\n"},                        # trailing newline
    {"lucide": "Terminal"},                          # upper case is not a Lucide name
    {"lucide": "terminal", "fill": "red"},           # not #RRGGBB
    {"lucide": "terminal", "fill": "#34D07F\n"},
    {"brand": "claude", "fill": "#FFFFFF"},          # brand marks are never recoloured
    "terminal",                                      # not an object
])
def test_invalid_specs_are_refused(spec):
    with pytest.raises(SystemExit):
        icons.spec_of("x", spec)

import numpy as np
import pytest

import sfx_kit

@pytest.mark.parametrize("kind", sfx_kit.KINDS)
def test_every_documented_kind_makes_finite_audio_under_full_scale(kind):
    mono, pan = sfx_kit.synth(kind)
    assert mono.ndim == 1 and len(mono) > sfx_kit.SR * 0.01
    assert np.all(np.isfinite(mono))
    assert np.max(np.abs(mono)) <= 1.0
    assert -1.0 <= pan <= 1.0


def test_every_kind_is_documented_at_the_top_of_the_kit():
    assert all(kind in sfx_kit.__doc__ for kind in sfx_kit.KINDS)


def test_unknown_kind_names_the_list():
    with pytest.raises(ValueError, match="sfx_kit.py"):
        sfx_kit.synth("kaboom")

## What does this change?

<!-- A short description and the motivation. Link the issue it closes: "Closes #123". -->

## How was it tested?

<!-- Demo mode, real hardware (which Pi / dongle), screenshots for UI changes. -->

## Checklist

- [ ] `pytest tests` and `node tests/i18n_check.mjs` pass
- [ ] New user-visible text is wrapped in `_t()` and has English in a `lang-en-*.js` catalog
- [ ] Runs comfortably on a Raspberry Pi Zero 2 W
- [ ] `INSTALL_REV` bumped if system packages or install steps changed
- [ ] `CHANGELOG.md` updated under *Unreleased*

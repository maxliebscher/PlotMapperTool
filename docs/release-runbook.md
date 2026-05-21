# PlotMapper Release Runbook

This note exists to avoid repeating the v1.2.0 release friction.

## Release Order

1. Finish implementation on a feature branch.
2. Run verification before publishing:
   - `npm.cmd test`
   - `npm.cmd run smoke`
   - `npm.cmd run build`
   - `git diff --check`
3. Update user-facing docs before opening or merging the release PR:
   - `README.md`
   - `CHANGELOG.md`
   - tutorial/help text in the app, if behavior changed
   - `releases/Plotmapper_vX.Y.Z.md`
   - `releases/Plotmapper_vX.Y.Z.html`
4. For the standalone release HTML, copy the generated `index.html` after `npm.cmd run build`:
   - `releases/Plotmapper_vX.Y.Z.html`
5. Add one release screenshot asset to the GitHub release.
   - Keep the original/high-quality release screenshot if useful.
   - For README galleries, prefer compressed `.jpg` or `.webp` instead of large `.png`.
6. Open a PR into `main`.
7. Merge the PR.
8. Only after merge, tag the actual `main` commit:
   - `git tag -a vX.Y.Z main -m "PlotMapper vX.Y.Z"`
   - `git push origin vX.Y.Z`
9. Create or update the GitHub release from that tag:
   - title: `PlotMapper vX.Y.Z`
   - notes from `releases/Plotmapper_vX.Y.Z.md`
   - upload `releases/Plotmapper_vX.Y.Z.html`
   - upload the release screenshot
10. Check the live demo:
   - GitHub Pages serves `main:/index.html`.
   - Confirm the live page contains the expected app version.
11. Delete fully merged working branches.

## v1.2.0 Specific Lessons

- The branch `v1.1.8-multiroute` became the `v1.2.0` release. Avoid version-number branch names for long-running work when the target version may change.
- The first release pass had the tag and PR but missed the standalone HTML, release image, and readable notes. Do not publish a release before the assets are ready.
- The first `v1.2.0` tag pointed at the pre-merge branch commit. Release tags should point at the final merged `main` commit.
- README screenshots should be lightweight. The v1.2.0 gallery was reduced from roughly 11.3 MB of PNGs to roughly 1.5 MB of JPGs.
- The release screenshot can stay as a PNG asset if it is the canonical high-quality release image.
- GitHub Pages is not updated by a release tag. It updates from `main`.
- After a clean merge, remove old working branches locally and remotely.

## Current Repository Rules

`main` is protected:

- Pull requests are required for normal work.
- Required checks: `test`, `build`.
- Stale reviews are dismissed.
- Force-push is disabled.
- Branch deletion is disabled.
- Admin enforcement is disabled so the owner can recover from mistakes.

## Useful Commands

```powershell
npm.cmd test
npm.cmd run smoke
npm.cmd run build
git diff --check

Copy-Item -LiteralPath index.html -Destination releases\Plotmapper_vX.Y.Z.html -Force

git tag -a vX.Y.Z main -m "PlotMapper vX.Y.Z"
git push origin vX.Y.Z

gh release create vX.Y.Z --repo maxliebscher/PlotMapperTool --target main --title "PlotMapper vX.Y.Z" --notes-file releases\Plotmapper_vX.Y.Z.md releases\Plotmapper_vX.Y.Z.html path\to\screenshot.png
gh release edit vX.Y.Z --repo maxliebscher/PlotMapperTool --notes-file releases\Plotmapper_vX.Y.Z.md --target main --latest

git push origin --delete old-feature-branch
git branch -d old-feature-branch
```

## Final Sanity Checks

Before calling a release done, verify:

- GitHub release has the standalone HTML asset.
- GitHub release has a screenshot asset and readable Markdown notes.
- Release tag resolves to the current `main` commit.
- README image links resolve.
- GitHub Pages live demo shows the expected app version.
- `git status -sb` is clean.

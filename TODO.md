# TODO

- [x] Add [nextjs-bundle-analysis](https://github.com/hashicorp/nextjs-bundle-analysis) to the PR CI process
- [x] Fix ESLint error: Cannot find package '@eslint/js' in packages/eslint-config
- [ ] Configure Next.js build caching for faster CI builds
- [ ] Fix cache path validation error in GitHub Actions workflow
- [ ] Setup [CodeCov](https://app.codecov.io/)
- [ ] Setup [Bencher CLI](https://github.com/marketplace/actions/bencher-cli)
- [ ] Setup LightHouseCI diff based on Vercels LightHouse CI reports, using [this](https://github.com/marketplace/actions/lighthouse-compare) and [this](https://github.com/marketplace/actions/vercel-preview-url-lighthouse-audit). We want the diff which I doubt the Vercel one does.
- [x] Disable NextJS telemetry
- [ ] Setup Turbo CI with heavy metrics / diff reporting
- Vercel build shows `Warning: Detected "engines": { "node": ">=22" } in your`package.json`that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version`
- [ ] Detect in CI if there are warnings in the browser console
- [ ] Detect in CI if there is unused js code on [first render](https://www.youtube.com/watch?v=pw14NzfYPa8)
- [ ] Setup [Biome](https://biomejs.dev/), but check how it will work with Next.js, Turbo ESLint plugin
- [ ] Ensure ESLint, Next.js, Turbo, Core web vitals, react-hooks are all working together nicely and reported in CI.
- [ ] Convert the nextJS github action into a separate package.

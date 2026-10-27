# 出典・調査・ライセンス / Sources and licenses

参照日 / Accessed: **2026-10-27**。外部ページの文章・図版・コードは転載していません。説明・図・SVGファビコンは本プロジェクト用に作成しています。 / No third-party prose, illustrations, or source code were copied. Explanations, diagrams, and the SVG favicon were created for this project.

## 物理と定数 / Physics and constants

| 出典 / Source | 採用内容 / Use |
| --- | --- |
| [NASA: Basics of Space Flight, Chapter 4](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/) | ホーマン遷移・先回りして到着・火星捕獲には減速が必要。 / Hohmann transfer, encounter timing, capture burn. |
| [NASA JPL: Calculating Launch Windows](https://www.jpl.nasa.gov/edu/resources/lesson-plan/lets-go-to-mars-calculating-launch-windows/) | 約259日・約44度という教育用の検算と課題構成。 / Approximate 259-day, 44-degree educational check. |
| [NASA Cassini: Gravity Assists](https://science.nasa.gov/mission/cassini/gravity-assists/) | 惑星中心と中心天体基準での速度・エネルギーの違い。 / Frame-dependent velocities and energy exchange. |
| [NASA NTRS: Copernicus trajectory system (AAS 12-236)](https://ntrs.nasa.gov/api/citations/20120001856/downloads/20120001856.pdf) | 指示書が指定する無推力旋回角の補足資料。 / Additional reference named in the original brief for unpowered flyby turning angle. |
| [JPL SSD: Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html) | 1日・AU・太陽GM・地球GM。火星系GMは火星単体GMの代用にしない。 / Day, AU, Sun GM, Earth GM; Mars system GM is not substituted for Mars GM. |
| [JPL SSD: Satellite Physical Parameters](https://ssd.jpl.nasa.gov/sats/phys_par/) | 指示書の火星単体GMの出典。ページの表は動的であるため、実行時に取得せず指定値を固定。 / Source referenced by the brief for Mars-only GM; the specified value is bundled, not fetched at runtime. |
| [JPL Horizons Manual](https://ssd.jpl.nasa.gov/horizons/manual.html) | 将来の実天体暦拡張用。現MVPはHorizonsデータを使わない。 / Future ephemeris extension; unused by the MVP. |

### 固定モデル値 / Fixed model values

値は元の指示書の再現性を優先して固定しています。観測値の自動更新は行いません。 / Values are pinned to reproduce the original specification; they are not automatically updated.

| 定数 / Constant | 値 / Value | 単位 / Unit | 採用理由 / Rationale |
| --- | ---: | --- | --- |
| AU | 149597870.7 | km | JPL/IAUの定義、m→km換算 / JPL/IAU definition |
| 1 day | 86400 | s | 単位換算 / Unit conversion |
| μ Sun | 132712440041.279419 | km³/s² | JPLのSI値を換算 / JPL SI conversion |
| μ Earth | 398600.435507 | km³/s² | JPL DE440、地球単体 / Earth-only |
| μ Mars | 42828.37362 | km³/s² | 指示書指定の火星単体 / Mars-only value from brief |
| Earth orbit | 1 | AU | 円軌道モデル / Circular-model radius |
| Mars orbit | 1.523679 | AU | 教材固定値、実際の離心率省略 / Fixed circular-model radius |
| Earth radius | 6378.137 | km | 教材固定値 / Fixed teaching model |
| Mars radius | 3389.5 | km | 教材固定値 / Fixed teaching model |

## GitHubで比較した実装 / GitHub comparison

| プロジェクト | 調査結果・判断 / Finding and decision | ライセンス |
| --- | --- | --- |
| [poliastro/poliastro](https://github.com/poliastro/poliastro) | 軌道力学Pythonライブラリ。2026-10-27時点でarchive済み。参考調査のみ。 / Archived; research only. | MIT |
| [esa/pykep](https://github.com/esa/pykep) | C++/Pythonの軌道設計研究向け。ブラウザ内の限定教材には導入せず。 / Research trajectory toolkit; not a browser dependency. | MPL-2.0 |
| [cosinekitty/astronomy](https://github.com/cosinekitty/astronomy) | 実天体位置の計算。今回の理想円軌道モデルには不要。 / Ephemeris library; unnecessary for ideal circular model. | MIT |

ライセンス・archive状態はGitHub APIで確認。いずれもコードを取り込んでいません。 / License and archive status checked through GitHub API; none of their code is included.

## 配信・公開 / Build and deployment

- [Vite production build](https://vite.dev/guide/build.html): 相対base `./` と静的アセット生成。 / Relative base and static assets.
- [Vite static deployment](https://vite.dev/guide/static-deploy.html): `dist` をPagesへ配信。 / Publish `dist` to Pages.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): build/deployの依存、artifact、環境、OIDC権限。 / Build/deploy dependency, artifact, environment, OIDC permissions.

公式リリースとタグcommitを確認し、workflowをSHA固定しています。 / Release tags and commit IDs were verified; workflows pin the following SHAs.

| Action | Version | Commit |
| --- | --- | --- |
| [actions/checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) | 7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| [actions/setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0) | 7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| [actions/configure-pages](https://github.com/actions/configure-pages/releases/tag/v6.0.0) | 6.0.0 | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| [actions/upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0) | 5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| [actions/deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1) | 5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` |

## 同梱依存のライセンス / Bundled dependency licenses

直接依存の正確なバージョンは `package.json`、推移的依存は `package-lock.json` に固定しています。実際のライセンス本文は各パッケージに含まれます。 / Exact direct versions are in `package.json`, transitive versions in `package-lock.json`; each package includes its license text.

| 依存 / Dependency | 検証したインストール版 / Installed version | License |
| --- | --- | --- |
| React / React DOM | 19.3.1 | MIT |
| @types/react / @types/react-dom | 19.3.0 | MIT |
| Vite | 8.3.5 | MIT |
| @vitejs/plugin-react | 6.1.2 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Vitest | 5.0.5 | MIT |
| ESLint | 10.13.0 | MIT |
| typescript-eslint | 8.72.1 | MIT |
| @playwright/test | 1.64.1 | Apache-2.0 |

バージョン・ライセンスはインストール済み各 `package.json` から確認しました。React/React DOM以外は開発・検証ツールです。 / Versions and licenses were checked from installed package manifests. Packages other than React/React DOM are development and test tooling.

本プロジェクト自体の公開ライセンスはリポジトリ所有者が決定します。第三者ライブラリのライセンスを、本プロジェクト全体のライセンスと解釈しないでください。 / The repository owner decides this project's license. Third-party license terms do not by themselves license the entire project.

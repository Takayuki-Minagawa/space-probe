# 出典と依存ライブラリ / References and dependencies

物理の説明、固定定数、実装基盤に関する参考資料です。参照日: **2026-10-27**。図とSVGファビコンは本プロジェクト用に作成しています。

References for the physical model, bundled constants, and implementation. Accessed **2026-10-27**. Diagrams and the SVG favicon were created for this project.

## 物理の参考資料 / Physics references

| 資料 / Reference                                                                                                                       | 関連する内容 / Topic                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [NASA: Basics of Space Flight, Chapter 4](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/)                           | ホーマン遷移、惑星との遭遇、軌道投入。 / Hohmann transfer, planetary encounters, and orbit insertion.                  |
| [NASA JPL: Calculating Launch Windows](https://www.jpl.nasa.gov/edu/resources/lesson-plan/lets-go-to-mars-calculating-launch-windows/) | 約259日の飛行と約44度の火星先行角を用いる教材。 / Educational example using about 259 days and a 44-degree lead angle. |
| [NASA Cassini: Gravity Assists](https://science.nasa.gov/mission/cassini/gravity-assists/)                                             | 惑星とのエネルギー交換と、観測する座標系による速度の違い。 / Energy exchange and frame-dependent velocities.           |
| [NASA NTRS: Copernicus trajectory system, AAS 12-236](https://ntrs.nasa.gov/api/citations/20120001856/downloads/20120001856.pdf)       | 無推力スウィングバイの旋回角（式2）。 / Unpowered flyby turning angle, equation 2.                                     |

## 固定定数 / Bundled constants

定数は [src/physics.ts](../src/physics.ts) に単位とともに固定しています。太陽・地球の重力定数はJPLのDE440に関する資料、火星はMAR097由来の値を採用した教材モデルです。統一された精密暦のデータセットではなく、観測値の自動更新も行いません。

Constants and units are bundled in [src/physics.ts](../src/physics.ts). The model combines Sun/Earth values from JPL’s DE440 documentation with a Mars value derived from MAR097. It is not a consistent precision-ephemeris dataset and does not update automatically.

| 定数 / Constant              |                 値 / Value | 根拠 / Basis                                                                                                                                                  |
| ---------------------------- | -------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AU                           |             149597870.7 km | [JPL Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html)、mからkmに換算。 / Converted from metres.                                              |
| 1 day                        |                    86400 s | 同資料の単位換算。 / Unit conversion in the same reference.                                                                                                   |
| μ Sun                        | 132712440041.279419 km³/s² | 同資料の太陽GMをSI単位から換算。 / Solar GM converted from SI.                                                                                                |
| μ Earth                      |       398600.435507 km³/s² | 同資料の地球単体GM。 / Earth-only GM in the same reference.                                                                                                   |
| μ Mars                       |         42828.37362 km³/s² | [JPL NAIF gm_de431.tpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de431.tpc) の `BODY499_GM`（MAR097）を丸めた値。 / Rounded Mars-only value. |
| Earth orbit                  |                       1 AU | 教材の円軌道半径。 / Fixed circular-model radius.                                                                                                             |
| Mars orbit                   |                1.523679 AU | 教材の円軌道半径。 / Fixed circular-model radius.                                                                                                             |
| Earth radius                 |                6378.137 km | 教材の固定半径。 / Fixed model radius.                                                                                                                        |
| Mars radius                  |                  3389.5 km | 教材の固定半径。 / Fixed model radius.                                                                                                                        |
| Earth / Mars safety altitude |               150 / 100 km | 教材の入力・判定制約。実運用の基準ではありません。 / Teaching constraints, not operational limits.                                                            |

火星単体のGMと、衛星を含む火星系GMは異なります。半径・軌道半径には形状や時代変化を反映しません。固定値から得る参考結果と判定条件は [モデル仕様](MODEL_SPEC.md) に記載しています。

Mars-only GM differs from Mars-system GM, which includes its moons. Fixed radii omit shape and epoch dependence. See the [model specification](MODEL_SPEC.md) for reference results and evaluation criteria.

## 実装・配信 / Implementation and deployment

- [Vite production build](https://vite.dev/guide/build.html) — 静的アセット生成と相対base。 / Static assets and relative base.
- [Vite static deployment](https://vite.dev/guide/static-deploy.html) — GitHub Pagesへの配信。 / Deployment to GitHub Pages.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) — artifact、環境、公開権限。 / Artifacts, environments, and deployment permissions.
- [KaTeX API](https://katex.org/docs/api.html) — TeX数式をHTMLとMathMLで表示。CSSと数式用フォントはサイトに同梱。 / TeX rendering with HTML and MathML; CSS and math fonts are bundled locally.

公式Actionsのバージョンと固定SHAは [CI](../.github/workflows/ci.yml) と [Pages](../.github/workflows/pages.yml) に記載しています。

Official Action versions and pinned SHAs are recorded in the [CI](../.github/workflows/ci.yml) and [Pages](../.github/workflows/pages.yml) workflows.

## 依存ライブラリとライセンス / Dependencies and licenses

直接依存のバージョンは [package.json](../package.json)、推移的依存は [package-lock.json](../package-lock.json) を参照してください。ライセンス本文は各パッケージに含まれます。

Direct versions are in [package.json](../package.json), and transitive versions are in [package-lock.json](../package-lock.json). Each package includes its license text.

| 依存 / Dependency               | License    |
| ------------------------------- | ---------- |
| React / React DOM               | MIT        |
| KaTeX                           | MIT        |
| @types/react / @types/react-dom | MIT        |
| Vite / @vitejs/plugin-react     | MIT        |
| TypeScript                      | Apache-2.0 |
| Vitest                          | MIT        |
| ESLint / typescript-eslint      | MIT        |
| @playwright/test                | Apache-2.0 |

React、React DOM、KaTeXが実行時の依存です。残りは開発・検証用です。[KaTeXのライセンス本文](../public/katex-LICENSE.txt) は配信成果物にも含めています。本リポジトリにはプロジェクト全体の `LICENSE` ファイルを設けていません。この一覧は依存ライブラリのライセンスを示します。

React, React DOM, and KaTeX are runtime dependencies; the remaining packages are development/test tools. The [KaTeX license](../public/katex-LICENSE.txt) is also included in the published site. This repository has no project-wide `LICENSE` file. The table describes dependency licenses.

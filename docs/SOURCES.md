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

共通定数は [src/physics.ts](../src/physics.ts)、9天体の定数は [src/solarSystem.ts](../src/solarSystem.ts) に単位とともに固定しています。各資料から選んだ値を円軌道・球対称の教材モデルに組み合わせており、統一された精密暦のデータセットではありません。観測値の自動更新も行いません。

Common constants are bundled in [src/physics.ts](../src/physics.ts), with the nine bodies in [src/solarSystem.ts](../src/solarSystem.ts). Selected values from the references are combined into a circular, spherical teaching model, not a consistent precision ephemeris. Values do not update automatically.

| 定数 / Constant              |                 値 / Value | 根拠 / Basis                                                                                                                                                  |
| ---------------------------- | -------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AU                           |             149597870.7 km | [JPL Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html)、mからkmに換算。 / Converted from metres.                                              |
| 1 day                        |                    86400 s | 同資料の単位換算。 / Unit conversion in the same reference.                                                                                                   |
| μ Sun                        | 132712440041.279419 km³/s² | 同資料の太陽GMをSI単位から換算。 / Solar GM converted from SI.                                                                                                |

| 天体 / Body | GM (km³/s²) | 採用半径 / Radius (km) | 円軌道半径 / Circular orbit radius |
| --- | ---: | ---: | ---: |
| 水星 / Mercury | 22031.868551 | 2439.4 | 0.38709927 AU |
| 金星 / Venus | 324858.592 | 6051.8 | 0.72333566 AU |
| 地球 / Earth | 398600.435507 | 6378.137 | 1 AU |
| 火星 / Mars | 42828.37362 | 3389.5 | 1.523679 AU |
| 木星 / Jupiter | 126686531.9003704 | 71492 | 5.202887 AU |
| 土星 / Saturn | 37931206.23436167 | 60268 | 9.53667594 AU |
| 天王星 / Uranus | 5793951.256527211 | 25559 | 19.18916464 AU |
| 海王星 / Neptune | 6835103.145462294 | 24764 | 30.06992276 AU |
| 月 / Moon | 4902.800118 | 1737.4 | 384400 km（地球中心 / Earth-centered） |

**GMの根拠 / GM provenance**

- 水星・金星・地球・月は [JPL Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html) のDE440値を採用し、表示の桁数に丸めています。 / Mercury, Venus, Earth, and Moon use the DE440 values, rounded as listed.
- 火星・木星・土星・天王星・海王星は [JPL NAIF gm_de440.tpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc) の `BODY499_GM`、`BODY599_GM`、`BODY699_GM`、`BODY799_GM`、`BODY899_GM` を使用します。火星は基礎実験と同じ丸め値です。このファイルの惑星単体GMには衛星暦由来の値が含まれます。 / These body-specific entries are used, with Mars rounded to match the guided labs. The file's planet-only GMs include values derived from satellite ephemerides.

惑星単体のGMと衛星を含む惑星系GMは異なります。局所の出発・捕獲には惑星単体の値を用います。例えば、木星は `BODY599_GM` であり、木星系の `BODY5_GM` ではありません。

Planet-only and planet-system GMs differ because the latter includes satellites. Local burn calculations use the planet alone: for example, Jupiter uses `BODY599_GM`, not `BODY5_GM`.

**半径と軌道半径 / Body and orbital radii**

- [JPL Planetary Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html)：水星・金星・火星の平均半径、巨大惑星の赤道半径。地球は赤道半径を丸めた6378.137 kmを継続使用します。巨大惑星の基準半径は固い地表を表しません。 / Mean radii for Mercury, Venus, and Mars; equatorial radii for giant planets. Earth retains a rounded equatorial radius of 6378.137 km. Giant-planet radii do not denote solid surfaces.
- [JPL Approximate Positions of the Planets, Table 1](https://ssd.jpl.nasa.gov/planets/approx_pos.html)：水星・金星・巨大惑星のJ2000半長軸を固定円軌道半径へ採用。軌道の離心率・傾斜・経年変化は使いません。地球1 AU、火星1.523679 AUは基礎実験と共通の教材値です。 / J2000 semimajor axes are reused as circular radii for Mercury, Venus, and the giant planets. Eccentricities, inclinations, and rates are omitted. Earth and Mars retain the guided labs' fixed radii.
- [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html)：月の体積平均半径1737.4 kmと半長軸384400 km。半長軸を円軌道半径として使います。 / Lunar volumetric mean radius and semimajor axis, with the latter reused as a circular radius.

教材の最低高度は地球150 km、月50 km、他の岩石惑星100 km、巨大惑星1,000 kmです。中心間の遭遇の許容距離は惑星間10,000 km、月往路1,000 kmです。月復路は地球の目標円軌道半径との差1 km以下を判定し、地球中心との遭遇距離ではありません。いずれも学習用の選択で、出典資料が保証する安全・接近基準ではありません。固定値から得る参考結果と判定条件は [モデル仕様](MODEL_SPEC.md) に記載しています。

Minimum altitudes and encounter tolerances are teaching choices, not source-backed operational safety or approach limits. Lunar return evaluates an absolute Earth target-radius error of at most 1 km, not a center-to-center rendezvous distance. See the [model specification](MODEL_SPEC.md) for their values, reference results, and evaluation criteria.

月の往路・復路の比較は、同じ地球・月の定数と高度条件を使い、地球中心の楕円と月中心の局所噴射を逆向きに適用した計算です。帰路用に別の天体定数や実ミッションの飛行時間を追加していません。対称な飛行時間・Δvはこのモデルから導く値で、一次資料の実ミッションの実績値ではありません。地球復路の到着には、束縛楕円の近点速度を使います。

The lunar outbound/return comparison uses the same Earth/Moon constants and altitude conditions, reversing the geocentric ellipse and local lunar burn estimates. It adds no separate return constants or real-mission flight times. Equal times and Δv budgets follow from this model's symmetry, not measured mission results in the source material. Earth return arrival uses the bound ellipse's periapsis speed.

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

| 依存 / Dependency               | License     |
| ------------------------------- | ----------- |
| React / React DOM               | MIT         |
| KaTeX（コード / code）          | MIT         |
| KaTeX fonts                     | SIL OFL 1.1 |
| @types/react / @types/react-dom | MIT         |
| Vite / @vitejs/plugin-react     | MIT         |
| TypeScript                      | Apache-2.0  |
| Vitest                          | MIT         |
| ESLint / typescript-eslint      | MIT         |
| @playwright/test                | Apache-2.0  |

React、React DOM、KaTeXが実行時の依存です。残りは開発・検証用です。KaTeXのコードはMIT、同梱フォントはSIL Open Font License 1.1です。[コードのライセンス本文](../public/katex-LICENSE.txt) と[フォントの著作権表示・ライセンス本文](../public/katex-fonts-LICENSE.txt) を配信成果物にも含めています。フォントは変更せず同梱し、そのメタデータに記載された著作権・予約フォント名と、[SIL公式のOFL本文](https://openfontlicense.org/open-font-license-official-text/) を収録しています。本リポジトリにはプロジェクト全体の `LICENSE` ファイルを設けていません。この一覧は依存ライブラリとフォントのライセンスを示します。

React, React DOM, and KaTeX are runtime dependencies; the remaining packages are development/test tools. KaTeX code uses MIT, while its bundled fonts use SIL Open Font License 1.1. The published site includes both the [code license](../public/katex-LICENSE.txt) and [font copyright notices and license](../public/katex-fonts-LICENSE.txt). Fonts are bundled unmodified; their metadata supplies the copyright and Reserved Font Names, accompanied by the [official SIL OFL text](https://openfontlicense.org/open-font-license-official-text/). This repository has no project-wide `LICENSE` file. The table describes dependency and font licenses.

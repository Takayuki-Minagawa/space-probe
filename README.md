# 惑星航路ラボ / Planetary Route Lab

**[ブラウザーで体験する / Open the app](https://takayuki-minagawa.github.io/space-probe/)**

太陽系の8惑星と月を題材に、行き先や出発時期、噴射量が宇宙の旅に与える影響を学ぶWeb教材です。惑星間の航路、地球と各惑星・月の往復比較、5つの基礎実験で、条件を変えながら軌道・所要時間・必要な速度変化を比較できます。

Explore journeys among the eight planets and compare both directions between Earth and each planet or the Moon. Change the destination, departure timing, or burns, then compare trajectories, travel time, and required velocity changes. Five guided experiments introduce the underlying orbital mechanics.

日本語／英語、ライト／ダーク表示に対応し、簡易マニュアルも両言語で利用できます。初期言語は日本語です。アカウント登録やインストールは必要ありません。

Japanese and English, light and dark themes, and a bilingual quick guide are available. Japanese is the default. No account or installation is required.

![基礎実験「火星へ向かう」の日本語・ダーク表示 / Guided Mars transfer experiment, Japanese dark theme](docs/screenshots/dark-ja.jpg)

## はじめての実験 / First experiment

1. 「太陽系の航路」で地球→月を選び、到着時の位置と約5日の飛行時間を確認します。
2. 出発高度や位相のずれを変え、必要な噴射量や到着時の距離がどう変わるか比べます。TeXの計算過程で、入力値と結果をたどれます。
3. 「月の往路と復路を比べる」で飛行時間と出発・到着のΔvを見比べ、「復路を表示」で月→地球の計算へ切り替えます。地球→火星や地球→木星でも同様に往復を比較できます。基礎実験では予想・ヒント・解説を使って学べます。

**English**

1. In **Solar system routes**, select Earth → Moon and inspect the arrival position and roughly five-day flight time.
2. Change departure altitude or phase offset, then compare the required burn and arrival distance. Follow the inputs through the TeX calculations.
3. In **Compare lunar outbound and return routes**, compare flight times and departure/arrival Δv, then select **Show return** to inspect Moon → Earth. Compare both directions for Earth–Mars or Earth–Jupiter in the same way. Use the guided experiments for predictions, hints, and explanations.

## 行き先を選んで比較 / Choose a route

水星・金星・地球・火星・木星・土星・天王星・海王星から出発地と目的地を選べます。同じ惑星を除く56通りの惑星間航路に、地球→月と月→地球を加えた58通りを扱います。月を含む航路の相手は地球です。月と他の惑星の直行航路や、他の惑星の衛星は対象に含みません。

Choose an origin and destination among Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. There are 56 ordered planet-to-planet routes plus Earth → Moon and Moon → Earth: 58 routes in total. Lunar routes connect only with Earth. Direct routes between the Moon and other planets, and other planetary moons, are outside this module.

| 変える条件 / Setting | 比較できること / What changes |
| --- | --- |
| 出発地・目的地 / Origin and destination | 遷移軌道、飛行時間、出発・到着の速度。 / Transfer ellipse, flight time, and departure/arrival speeds. |
| 出発・到着高度 / Departure and arrival altitude | 待機円軌道からの噴射と、目的地の円軌道への減速量。月の往復では地球側の高度によって遷移楕円も変化します。 / Departure and circular-capture burns; the Earth-side altitude also changes the lunar transfer ellipse in either direction. |
| 位相のずれ・出発待ち / Phase offset and wait | 惑星間・月往路では到着位置。月復路では出発方向と楕円の向き。 / Encounter geometry for planetary and outbound lunar routes; departure direction and ellipse orientation for lunar return. |
| 捕獲噴射の割合 / Capture burn fraction | 減速後の束縛・通過、近点・遠点、目標円軌道との差。 / Bound capture or flyby, apsides, and deviation from the target circular orbit. |

位相や待ち時間の変更は、選択したホーマン遷移の形と飛行時間を変えません。惑星間・月往路で到着時に離れている場合、局所的な捕獲計算は「予定どおり遭遇した場合」の参考値です。噴射を増やすだけで到着位置のずれを修正する機能ではありません。月復路は地球中心の近点を目標高度へ合わせる計算で、動く地球との待ち合わせではありません。

Phase and waiting do not change the chosen Hohmann ellipse's shape or flight duration. On planetary and outbound lunar routes, a miss leaves local capture as a reference for an aligned encounter; increasing the capture burn does not correct the miss. Lunar return targets a geocentric periapsis altitude rather than a rendezvous with a moving Earth.

## 惑星の往路と復路を比べる / Compare planetary outbound and return routes

地球と水星・金星・火星・木星・土星・天王星・海王星の航路では、地球からの往路と地球への復路を並べて比較できます。比較欄は両天体で同じ周回高度を使い、位相のずれ・待ち時間を0、到着時の円軌道化を100%とした参考条件で、飛行時間・出発Δv・到着Δv・合計Δvとその差を表示します。TeX数式で、太陽中心の飛行と各惑星近傍の噴射を分けてたどれます。

For routes between Earth and Mercury, Venus, Mars, Jupiter, Saturn, Uranus, or Neptune, compare the Earth outbound and Earth return directions side by side. Both use matching per-body parking altitudes, zero phase offset and waiting time, and full arrival circularization. The table shows flight time, departure Δv, arrival Δv, total Δv, and their differences. TeX equations distinguish the Sun-centered transfer from burns near each planet.

「往路を表示」「復路を表示」は天体ごとの高度を保って方向を切り替え、位相・待ち時間を0、噴射割合を1へ戻します。高度を変えると必要な局所Δvは変わりますが、この惑星間モデルの飛行時間は公転半径で決まり、高度には依存しません。

**Show outbound** and **Show return** keep each body's altitude while resetting phase and wait to zero and the burn fraction to one. Altitude changes affect local Δv, while planetary flight time depends on the fixed orbital radii rather than parking altitude.

| 地球200 km・火星300 kmの参考条件 / Reference: Earth 200 km, Mars 300 km | 飛行時間 / Flight time | 出発Δv / Departure Δv | 到着Δv / Arrival Δv | 合計Δv / Total Δv |
| --- | ---: | ---: | ---: | ---: |
| 地球→火星 / Earth → Mars | 258.87日 / days | 3.611 km/s | 2.091 km/s | 5.703 km/s |
| 火星→地球 / Mars → Earth | 258.87日 / days | 2.091 km/s | 3.611 km/s | 5.703 km/s |

同じ公転半径と周回高度では、往復の飛行時間と合計Δvが等しく、出発・到着のΔvが入れ替わります。一方、目的地が動く速さは方向によって異なるため、参考の先行角は別に計算します。比較欄は各方向を独立した参考条件で評価し、到着直後にそのまま帰れることや、実ミッションの往復で燃料・総日程が等しいことを示すものではありません。地球復路の目標は周回円軌道で、大気圏再突入・着陸・大気による減速は含みません。

At matching orbital radii and parking altitudes, flight time and total Δv are equal, while departure and arrival Δv swap. Reference lead angles are calculated separately because the destination's angular speed differs by direction. Each direction is an independent reference; the comparison does not imply an immediate return after arrival or equal fuel use and total schedules in real missions. The Earth return target is a circular parking orbit; atmospheric entry, landing, and atmospheric braking are excluded.

## 月の往路と復路を比べる / Compare lunar outbound and return routes

月の航路を選ぶと、同じ地球側・月側の高度で、往路と復路の飛行時間・出発Δv・到着Δv・合計Δvを並べて確認できます。比較欄は、基準の位相・待ち時間と、目標円軌道に必要な減速量で計算します。「往路を表示」「復路を表示」は両天体の高度を保って方向を切り替え、位相・待ち時間・噴射割合を参考条件へ戻します。両方向のTeX数式では、現在の高度を使った計算をたどれます。

Selecting a lunar route shows outbound and return flight time, departure Δv, arrival Δv, and total Δv at matching Earth and Moon altitudes. The comparison uses reference phase/wait conditions and full circularization burns. **Show outbound** and **Show return** preserve each body's altitude while resetting phase, wait, and burn fraction to the reference. TeX equations show both calculations using the selected altitudes.

| 地球200 km・月100 kmの参考条件 / Reference: Earth 200 km, Moon 100 km | 飛行時間 / Flight time | 出発Δv / Departure Δv | 到着Δv / Arrival Δv | 合計Δv / Total Δv |
| --- | ---: | ---: | ---: | ---: |
| 地球→月 / Earth → Moon | 4.978日 / days | 3.131 km/s | 0.822 km/s | 3.953 km/s |
| 月→地球 / Moon → Earth | 4.978日 / days | 0.822 km/s | 3.131 km/s | 3.953 km/s |

この対称な近似モデルでは、同じ両端条件を逆向きにたどるため、飛行時間と合計Δvは等しく、出発・到着の噴射量が入れ替わります。実ミッションの往復で燃料や日程が等しいという意味ではありません。月復路の目標は**地球の円軌道**で、地表への帰還・大気圏再突入・大気による減速は計算しません。

The symmetric approximation follows the same endpoint conditions in reverse, so flight time and total Δv match while departure and arrival burns swap. This does not imply equal fuel use or schedules for real outbound and return missions. The lunar return target is an **Earth circular orbit**; landing, atmospheric entry, and atmospheric braking are not modeled.

## 5つの基礎実験 / Five guided experiments

| 実験 / Lab                      | 操作と発見 / Change and observe                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 軌道の基本 / Orbit basics       | 加速・減速すると、円軌道がどのように変わるか。 / How a burn changes a circular orbit.                                                |
| 地球から出発 / Leave Earth      | 同じ脱出目標でも、待機高度によって必要なΔvがどう変わるか。 / How parking altitude affects the burn needed for a fixed escape target. |
| 火星へ向かう / Journey to Mars  | なぜ現在の火星ではなく、到着時の火星を目指すのか。 / Why a spacecraft must meet Mars where it will be at arrival.                    |
| 火星で止まる / Capture at Mars  | なぜ接近するだけでは周回できず、減速が必要なのか。 / Why arrival alone does not put a spacecraft into orbit.                         |
| スウィングバイ / Gravity assist | 惑星との遭遇で、太陽から見た速さが増減するのはなぜか。 / How a planetary encounter changes Sun-relative speed.                       |

各実験では、数値入力とスライダー、再生・停止・ステップ・時間移動、参考軌道の重ね合わせを使えます。「計算の流れと比較」では入力値から結果までをたどり、試す例と参考設定との差を確認できます。

Each lab provides numeric inputs, sliders, playback, stepping, timeline navigation, and a reference overlay. **Follow the calculation** connects inputs to results, with example settings and comparisons to the reference.

数式はTeXで組版し、分数・平方根・添字・ベクトルを表示します。数式用フォントもサイトに同梱しています。

Equations are typeset from TeX, with fractions, roots, subscripts, and vectors. Math fonts are bundled with the site.

![火星先行角を10度変えた計算例 / Calculation after a 10-degree Mars phase shift](docs/screenshots/calculation-ja.jpg)

Tabで操作項目を移動し、ボタンはEnter／Space、スライダーは矢印キーで操作できます。自動再生はありません。言語と配色は同じブラウザーに保存されます。実験条件と課題の進捗は再読み込みでリセットされます。

Navigate with Tab, use Enter/Space for buttons, and arrow keys for sliders. Nothing autoplays. Language and theme are saved in your browser; experiment settings and challenge progress reset on reload.

## 計算モデル / Model

**教育用の近似モデルです。実際の打上げ・探査機運用・航法には使用できません。**

**An educational approximation, not for actual launch, spacecraft operations, or navigation.**

- 2次元・同一平面・惑星の円軌道・二体重力・瞬時噴射を仮定します。 / Two dimensions, one plane, circular planetary orbits, two-body gravity, and instantaneous burns.
- 惑星間の飛行は太陽中心、月の往復は地球中心で計算します。月往路の地球出発と月復路の地球到着には、地球に束縛された楕円の速度を使います。 / Planetary transfers use a Sun-centered frame; both lunar directions use a bound Earth-centered ellipse, including Earth departure and return arrival.
- 出発・捕獲の局所計算は独立した近似です。遷移軌道と有限の作用圏で接続した一本の航法解ではありません。 / Local departure/capture estimates are independent approximations, not a navigation trajectory joined at finite spheres of influence.
- 遭遇と捕獲・目標円軌道を別に判定します。遭遇の許容距離は教材上の値で、実ミッションの接近条件ではありません。 / Encounter, bound capture, and the target circle are separate evaluations. Encounter tolerances are teaching choices, not operational approach criteria.
- 地球→火星の参考飛行時間は約259日、月の往路・復路はそれぞれ約5日です。実際のミッションでは別の航路や飛行時間を選ぶことがあります。 / Reference flights take about 259 days to Mars and five days for each lunar direction. Actual missions can use different trajectories and durations.
- 巨大惑星の高度は採用した基準半径から測ります。固い地表への着陸を表しません。大気・環・放射線などによる制約は計算しません。 / Giant-planet altitudes use a reference radius, not a solid landing surface. Atmospheres, rings, and radiation constraints are omitted.
- 地表打上げ、大気、有限燃焼、3D、多天体摂動、実暦による打上げ窓は扱いません。 / Surface launch, atmospheres, finite burns, 3D, perturbations, and calendar launch windows are outside the model.

数式・定数・判定条件・参考値は [モデル仕様 / Model specification](docs/MODEL_SPEC.md)、参考資料と依存ライブラリは [出典 / Sources](docs/SOURCES.md) にまとめています。

## 関連する学習アプリ / Related learning apps

同じ作者の教材を、学びたい内容に応じて選べます。惑星航路ラボでは、探査機の出発・飛行・減速を操作して学びます。

Explore these related apps by the same author. Planetary Route Lab focuses on changing a spacecraft’s departure, flight geometry, and braking.

| アプリ / App                                                                                                      | 主なテーマ / Focus                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [GEO LEARNER](https://takayuki-minagawa.github.io/GEO-LEARNER/)                                                   | 他の天体から地球がどう見えるか。 / How Earth looks from other bodies.                               |
| [Web Planetarium](https://takayuki-minagawa.github.io/web-planetarium/)                                           | 日時と場所に応じた星空観察。 / The sky at a chosen date and location.                               |
| [月の満ち欠け・日食月食 / Moon phases and eclipses](https://takayuki-minagawa.github.io/moon-phases-eclipse-sim/) | 太陽・地球・月の配置と光・影。 / Sun–Earth–Moon geometry, light, and shadow.                        |
| [年周視差 / Stellar parallax](https://takayuki-minagawa.github.io/stellar-parallax-sim/)                          | 見かけの位置変化から恒星の距離を測る。 / Measuring stellar distance from apparent position changes. |
| [季節と太陽高度 / Seasons and solar altitude](https://takayuki-minagawa.github.io/solar-altitude-sim/)            | 緯度・季節・時刻と太陽の見え方。 / Latitude, seasons, time, and the Sun’s position.                 |

## ローカルで動かす / Run locally

[.nvmrc](.nvmrc) のNode.jsとnpmを使用します。依存バージョンは [package.json](package.json) と [package-lock.json](package-lock.json) で管理しています。

Use the Node.js version in [.nvmrc](.nvmrc) and npm. Dependency versions are recorded in [package.json](package.json) and [package-lock.json](package-lock.json).

```sh
npm ci
npm run dev
```

ターミナルに表示されるURLを開いてください。計算はブラウザー内で行い、外部APIやCDN、外部フォントは使用しません。初回の依存インストールにはネットワーク接続が必要です。

Open the URL printed in the terminal. Calculations run in the browser without external APIs, CDNs, or fonts. Installing dependencies requires network access.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

ビルド成果物は `dist/` です。ローカルでもHTTPサーバー経由で開きます。環境ごとの実行手順は [開発ガイド / Development guide](docs/DEVELOPMENT_PLAN.md) を参照してください。

Build output is in `dist/` and should be served over HTTP. See the [development guide](docs/DEVELOPMENT_PLAN.md) for environment-specific setup.

## 公開と品質確認 / Deployment and checks

`main` へのpushで、型検査・lint・単体／UIテスト・ビルド・ブラウザーテストを実行し、成功した成果物をGitHub Pagesへ公開します。手動実行は **Actions → Deploy GitHub Pages → Run workflow → main** から行えます。別のリポジトリで使う場合は、**Settings → Pages → Source → GitHub Actions** を設定してください。

Pushes to `main` run type checks, lint, unit/UI tests, build, and browser tests before publishing to GitHub Pages. To deploy manually, use **Actions → Deploy GitHub Pages → Run workflow → main**. For another repository, set **Settings → Pages → Source → GitHub Actions**.

- [CIの実行結果 / CI runs](https://github.com/Takayuki-Minagawa/space-probe/actions/workflows/ci.yml)
- [公開ワークフロー / Deployment runs](https://github.com/Takayuki-Minagawa/space-probe/actions/workflows/pages.yml)

CIではChromiumのデスクトップ表示とモバイル表示のエミュレーションを検査します。実機の全ブラウザーでの動作を保証するものではありません。

CI tests desktop and emulated mobile layouts in Chromium. This does not establish compatibility with every physical device or browser.

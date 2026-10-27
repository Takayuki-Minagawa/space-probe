# 開発ガイド / Development guide

惑星航路ラボの構成、検証方法、公開手順を説明します。学習内容と物理の仮定は [モデル仕様](MODEL_SPEC.md)、利用方法は [README](../README.md) を参照してください。

This guide covers architecture, validation, and deployment. See the [model specification](MODEL_SPEC.md) for physics and the [README](../README.md) for usage.

## 構成 / Architecture

| ファイル / File                  | 役割 / Responsibility                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/physics.ts`                 | 単位・定数・二体伝播・遷移・噴射・衝突の計算。 / Units, constants, propagation, transfer, burns, and impacts.             |
| `src/solarSystem.ts`             | 9天体の定数、56通りの惑星間航路と地球→月、位相・出発・捕獲の計算。 / Nine-body data, 56 planetary routes and Earth → Moon, phase, departure, and capture calculations. |
| `src/SolarSystemLab.tsx`         | 航路選択、条件変更、時間操作、軌道図、TeX計算過程、地球からの航路比較。 / Route selection, settings, timeline, orbit diagram, TeX walkthrough, and Earth-origin comparisons. |
| `src/simulation.ts`              | 実験の入力、参考設定、時間範囲、軌跡サンプル。 / Experiment parameters, reference settings, time spans, and path samples. |
| `src/learning.ts`                | 日英の課題・解説・マニュアル。 / Bilingual challenges, explanations, and guide.                                           |
| `src/App.tsx`                    | 操作、入力検証、時間制御、表示状態。 / Interaction, input validation, time controls, and view state.                      |
| `src/CalculationWalkthrough.tsx` | 計算過程と参考設定との比較。 / Calculation steps and reference comparisons.                                               |
| `src/OrbitDiagram.tsx`           | 同じ物理状態に基づくSVG軌道図と速度グラフ。 / SVG trajectories and speed chart from the same physical state.              |
| `src/components.tsx`             | 共通入力部品とアイコン。 / Shared inputs and icons.                                                                       |
| `e2e/app.spec.ts`                | 利用者の操作を通したブラウザー検証。 / Browser checks of user interactions.                                               |

物理計算はUIから独立した純粋関数です。太陽系の航路では `calculateRoute` が入力検証と参考値・捕獲判定、`routeAt` が指定時刻の状態を扱います。月への入力で中心天体を地球へ切り替え、地球脱出の超過速度を割り当てないことを型と値で区別しています。初期条件と仮想時刻から状態を求めるため、画面の大きさや描画頻度で軌道は変わりません。標準の軌跡は181点で、再生中に増やし続けません。SVGは線種、ラベル、数値表と組み合わせて表示します。

Physics uses pure functions independent of the UI. `calculateRoute` validates inputs and calculates reference budgets and capture state; `routeAt` provides a state at a chosen time. Lunar mode switches to Earth-centered gravity and represents Earth-escape excess speed as absent. Initial conditions and simulated time determine the state regardless of viewport or frame rate. Standard paths contain 181 samples. SVG views use line styles, labels, and numeric tables.

言語とテーマのみを `localStorage` に保存します。保存が利用できなくてもアプリは動作します。実験条件・課題進捗はメモリー内の状態です。アプリにログイン機能、アクセス解析、外部計算APIはありません。

Only language and theme are stored in `localStorage`; storage is optional. Experiment settings and progress are held in memory. The application includes no login, analytics, or external calculation API.

## 検証 / Validation

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

`--with-deps` はLinuxでブラウザーのシステム依存も準備します。Windowsでインストール済みEdgeを使う場合は次のように実行できます。

`--with-deps` also installs browser system dependencies on Linux. To use an installed Edge browser on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e -- --workers=2
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

| 検証層 / Layer       | 主な確認内容 / Coverage                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 物理 / Physics       | 56通りの惑星間航路、地球→月、内向き・外向きの符号、基礎実験との火星参考値の一致、保存量、軌道の境界、衝突、捕獲、スウィングバイ、異常入力。 / All planetary pairs, lunar route, inward/outward signs, Mars parity, invariants, conic boundaries, impacts, capture, flyby, and invalid inputs. |
| 入力部品 / Inputs    | 数値の編集中状態、範囲検査、無効値からの復帰。 / Numeric drafts, bounds, and recovery.                                                                                                                             |
| ブラウザー / Browser | 全章と課題、時間操作、言語とテーマ、簡易マニュアル、キーボード、低モーション、横あふれ、アセット読み込み。 / Labs, challenges, time controls, locale/theme, guide, keyboard, reduced motion, overflow, and assets. |

参考値は相対誤差0.1%以内、無噴射区間の保存量は `1e-8` を基準に検査します。試験条件と境界ケースはテストコードに記載しています。これらは教育モデルの実装に対する検査であり、実ミッションの精度保証ではありません。

Reference checks use 0.1% relative tolerance; unforced invariants use `1e-8`. Conditions and boundary cases are recorded in the tests. These checks validate the educational implementation, not operational mission accuracy.

## GitHub Pages / Deployment

[CI](../.github/workflows/ci.yml) はPRと `main` へのpushで検査します。[公開ワークフロー](../.github/workflows/pages.yml) は `main` 上での検査成功後、`dist/` を `github-pages` 環境へ配信します。PRのCIに公開権限は付与していません。

[CI](../.github/workflows/ci.yml) checks pull requests and pushes to `main`. The [Pages workflow](../.github/workflows/pages.yml) publishes `dist/` to the `github-pages` environment after checks pass on `main`. Pull-request CI has no deployment permissions.

公式Actionsはcommit SHAに固定しています。更新時は公式リリースとSHAの対応を確認します。Viteの相対base `./` により、プロジェクトのサブディレクトリ配信に対応します。Pagesにアップロードするのはビルド成果物だけです。READMEや開発文書はGitHubリポジトリ側の公開資料です。

Official Actions are pinned to commit SHAs; updates should match verified releases. Vite’s relative base `./` supports project subdirectories. Only build output is uploaded to Pages; the README and development documents are public repository documentation.

## 拡張の考え方 / Extension priorities

機能を増やす際は、「どの条件を変え、どの結果から学べるか」を明確にし、計算モデル・説明・課題・検証を一緒に更新します。天体データの追加では重力定数が天体単体か天体系全体か、半径が平均値か赤道の基準面かを確認します。実暦、月帰還、三体運動、作用圏での連続接続には、それぞれのモデルと検証が必要です。独立した局所計算を、そのまま連続した航法解として扱うことはできません。

New features should identify which input learners change and what result they can learn from, updating physics, explanations, challenges, and tests together. New body data must distinguish body-only from system GM, and mean radii from equatorial reference levels. Ephemerides, lunar return, three-body motion, and continuous sphere-of-influence joins require suitable models and validation. Independent local calculations cannot simply be treated as a continuous navigation solution.

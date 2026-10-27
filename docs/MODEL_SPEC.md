# 物理モデルと判定 / Physics model and evaluation

惑星航路ラボは、地球から火星への理想的なホーマン遷移と、惑星近傍の独立した実験を使う軌道力学教材です。本書はモデル `planar-two-body-1.0.0` の計算、表示、課題の判定を説明します。定数の出典と参考資料は [SOURCES.md](SOURCES.md)、操作方法は [README](../README.md) にまとめています。

Planetary Route Lab teaches orbital mechanics through an ideal Earth-to-Mars Hohmann transfer and independent local experiments. This document describes model `planar-two-body-1.0.0`; see [sources](SOURCES.md) and the [user guide](../README.md).

**教育用の近似モデルです。実際の打上げ・探査機運用・航法には使用できません。 / Educational approximation; not for launch, spacecraft operations, or navigation.**

## モデルの範囲 / Scope

| 実験 / Lab                      | 座標の中心 / Center                                                     | 主な入力 / Inputs                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 軌道の基本 / Orbit basics       | 地球 / Earth                                                            | 待機高度、符号付き接線噴射 / Parking altitude, signed tangential burn                                       |
| 地球から出発 / Leave Earth      | 地球 / Earth                                                            | 待機高度、目標の超過速度 / Parking altitude, target excess speed                                            |
| 火星へ向かう / Journey to Mars  | 太陽 / Sun                                                              | 基準時刻の火星先行角、出発待ち時間 / Initial Mars lead angle, departure wait                                |
| 火星で止まる / Capture at Mars  | 火星 / Mars                                                             | 近火点高度、減速量 / Periapsis altitude, braking burn                                                       |
| スウィングバイ / Gravity assist | 地球、太陽中心の速度比較 / Earth, with Sun-relative velocity comparison | 接近速度、近点高度、入射方向、通過側 / Incoming speed, periapsis altitude, incoming direction, passing side |

共通の仮定は、2次元・同一平面・球対称の中心重力・二体問題・瞬時噴射です。惑星間実験では地球と火星を円軌道で動かします。局所実験では対象惑星だけの重力を使います。

All experiments assume planar two-body gravity and instantaneous burns. Earth and Mars follow circular orbits in the transfer lab; each local lab uses only its central planet's gravity.

惑星間遷移と局所実験は、有限の作用圏境界で接続した一本の航路ではありません。火星捕獲には参考ホーマン遷移の到着超過速度を使いますが、遷移実験で生じた位置のずれを修正する機能はありません。スウィングバイも、火星直行航路に経由惑星を挿入する機能ではありません。

The labs are not joined into one trajectory at finite spheres of influence. Local capture uses the reference arrival excess speed and cannot correct a transfer miss. The gravity-assist lab does not add a waypoint to the Mars transfer.

## 単位、座標、時間 / Units, frames, and time

内部単位は km、s、rad、km/s、km³/s² です。画面では必要に応じて AU、日、度へ変換します。中心距離 `r`、高度 `h`、天体半径 `R` は `r = R + h` の関係にあり、位置・速度ベクトルは表示中の中心天体に対する相対値です。比角運動量には高度と区別して `H` を使います。

Internal units are km, s, rad, km/s, and km³/s². Altitude is measured above the model surface, while radius is measured from the center. Displayed positions and velocities are relative to the stated central body.

- 惑星間実験の経過時間は出発から到着までです。待ち時間は出発前に地球・火星の双方を進め、出発方向を変えます。 / Transfer elapsed time starts at departure; waiting advances both planets before departure.
- 軌道基礎・地球脱出・火星捕獲は、噴射直後を局所時刻 0 とします。 / Basics, escape, and capture start at local time zero immediately after the burn.
- スウィングバイは近点通過を局所時刻 0 とし、前後 2 時間を表示します。太陽中心の図は入出の漸近速度の合成であり、太陽中心軌跡の伝播ではありません。 / The flyby spans two hours before and after periapsis. Its Sun-frame diagram compares asymptotic velocity sums, not a propagated heliocentric path.

日時は相対時間であり、現実のカレンダー上の打上げ窓を表しません。太陽中心と惑星中心の図は異なる縮尺を使います。天体・探査機マーカーの見かけの大きさは、計算用の天体半径とは別です。

Time is relative, not a calendar launch window. Global and local diagrams have separate scales; marker sizes do not determine collision radii.

## 二体運動と噴射 / Two-body motion and burns

`μ = GM` とし、位置ベクトルを `r⃗`、速度ベクトルを `v⃗`、その大きさを `r`、`v` とします。

```text
加速度 / acceleration              a⃗ = −μ r⃗ / r³
円軌道速度 / circular speed        v_c = √(μ/r)
脱出速度 / escape speed            v_esc = √(2μ/r)
ビズ・ヴィヴァ / vis-viva          v² = μ(2/r − 1/a)
比軌道エネルギー / specific energy ε = v²/2 − μ/r
比角運動量 / specific angular momentum H = r_x v_y − r_y v_x
```

噴射後の位置・速度から離心率、近点、遠点、周期を計算します。`ε < 0` は束縛、`ε > 0` は双曲線です。放物線の判定には `|ε| ≤ 10⁻¹² μ/r` の許容差を使います。角運動量がほぼゼロの動径軌道は、対応範囲外として停止します。

Orbital elements come from the post-burn state. Negative energy indicates a bound orbit; positive energy indicates a hyperbola. A numerical tolerance identifies the parabolic boundary. Near-zero-angular-momentum radial trajectories are outside the supported domain.

軌道基礎では、初期円軌道の接線速度へ符号付き噴射量を加えます。正なら順行、負なら逆行です。無噴射区間は普遍変数法で仮想時刻から直接伝播します。楕円・放物線・双曲線を同じ枠組みで扱い、反復計算には上限と収束判定があります。未収束を有効な結果として表示しません。

The basics lab adds a signed tangential burn to the initial circular speed. Universal-variable propagation computes each state from simulated time, including elliptical, parabolic, and hyperbolic motion. Iterations are bounded; non-convergence is reported as a calculation failure.

## 地球から火星への遷移 / Earth-to-Mars transfer

地球と火星の円軌道半径を `r_E`、`r_M`、遷移楕円の半長軸を `a_T` とします。

```text
a_T = (r_E + r_M)/2
t_T = π √(a_T³/μ_Sun)
n_E = √(μ_Sun/r_E³), n_M = √(μ_Sun/r_M³)
v_E = √(μ_Sun/r_E), v_M = √(μ_Sun/r_M)
v_T1 = √(μ_Sun(2/r_E − 1/a_T))
v_T2 = √(μ_Sun(2/r_M − 1/a_T))
φ_reference = π − n_M t_T    (0 ≤ φ < 2π)
T_synodic = 2π / |n_E − n_M|
```

入力の位相角は**基準時刻**で地球より火星が先行する角度です。待ち時間 `t_wait` がある場合、出発時の位相角は `φ_depart = φ_input + (n_M − n_E)t_wait` を一周以内に正規化した値になります。遷移軌道の形と飛行時間は固定し、位相角・待ち時間による待ち合わせの成否を比較します。

The phase input describes Mars's lead at the reference epoch. Waiting changes the departure phase by `(n_M − n_E)t_wait`. Transfer shape and flight time remain fixed so learners can compare encounter timing.

遭遇課題は、規定到着時刻 `t_T` における距離 `|r⃗_spacecraft(t_T) − r⃗_Mars(t_T)| ≤ 10,000 km` で判定します。10,000 km は教材上の許容値で、捕獲条件や実運用の接近条件ではありません。参考設定の中心一致は理想化であり、火星内部へ向かう実航路を示すものではありません。

Encounter is evaluated at the prescribed arrival time with a 10,000 km teaching tolerance. It does not establish capture or an operational approach. Coincident centers in the reference are an idealization.

惑星相対速度は原則としてベクトル差です。参考ホーマン遷移では接線方向が揃うため、出発・到着の超過速度の大きさをそれぞれ `v_T1 − v_E`、`v_M − v_T2` で求めます。非遭遇時の速度ベクトル差は離れた位置での比較値であり、局所到着状態ではありません。

```text
v⃗∞ = v⃗_spacecraft − v⃗_planet
C3 = |v⃗∞,depart|²
```

Relative velocity is a vector difference. Scalar speed differences apply to the aligned reference transfer. At a miss, subtracting velocities at different locations does not produce a local arrival state.

## 地球脱出と火星捕獲 / Escape and capture

地球の待機円軌道から、指定の超過速度 `v∞` へ脱出する瞬時噴射量は次式です。

```text
r_parking = R_Earth + h_parking
Δv_depart = √(v∞² + 2μ_Earth/r_parking) − √(μ_Earth/r_parking)
```

火星捕獲は、参考ホーマン遷移の到着 `v∞` と指定した近火点を使います。画面の目標はその高度の円軌道です。噴射後の状態から軌道要素を再計算するため、減速しすぎて反対側の高度が下がる場合も判定に反映されます。

```text
r_p = R_Mars + h_periapsis
v_p = √(v∞,arrive² + 2μ_Mars/r_p)
v_c = √(μ_Mars/r_p)
Δv_circular = v_p − v_c
v_after = v_p − Δv_input
```

Escape Δv starts from a circular parking orbit. Capture uses the reference arrival excess speed and targets a circular orbit at the selected altitude. Elements are recalculated from the post-burn state, including cases with excessive braking.

火星の目標円軌道は、次の三条件を満たす場合に達成とします。

1. 噴射後の比軌道エネルギーが負で、放物線境界の許容差を超えて束縛されている。 / Bound beyond the parabolic numerical tolerance.
2. 噴射後の近点高度が 100 km 以上である。 / Post-burn periapsis altitude is at least 100 km.
3. 噴射後の近点・遠点の**中心距離**が、それぞれ目標円軌道半径の 1% 以内である。 / Both apsis radii are within 1% of the target circular radius.

安全高度以上の束縛軌道でも、目標と異なる場合は「捕獲」と「目標達成」を区別します。束縛されない軌道はフライバイ、安全高度を下回る軌道は課題未達成です。100 km は教材上の制約であり、現実の安全を保証する値ではありません。

Bound capture and target attainment are separate outcomes. Unbound trajectories fly past; trajectories below the teaching safety altitude do not meet the target. The 100 km threshold is not an operational safety standard.

## スウィングバイ / Gravity assist

地球を使う独立した無推力遭遇です。惑星中心の双曲線について、近点半径 `r_p` と超過速度 `v∞` から離心率と旋回角を求めます。

```text
r_p = R_Earth + h_periapsis
e = 1 + r_p v∞² / μ_Earth
δ = 2 asin(1/e)
v⃗∞,out = Rotate(±δ) v⃗∞,in
v⃗_Sun,in  = v⃗_Earth + v⃗∞,in
v⃗_Sun,out = v⃗_Earth + v⃗∞,out
```

入射方向は慣性方向に平行な軸に対する角度です。地球の公転速度を `+y` 方向に置き、通過側で旋回の符号を切り替えます。惑星中心では入出の**漸近速度の大きさ**が等しく、近点ではその速度より速くなります。太陽中心の入出速度は惑星速度とのベクトル合成で比較します。

The incoming angle uses fixed local axes, with Earth's orbital velocity along `+y`. Passing side selects the turn direction. Planet-relative asymptotic speeds are equal before and after the encounter; speed is higher near periapsis. Sun-relative velocities include Earth's orbital velocity.

地表以下の近点は衝突、地表より上でも 150 km 未満は教材の対応範囲外として再生を止めます。150 km は大気や地形を計算しない教材の制約です。太陽中心の速さの増減を、消費した推進 Δv へ加算しません。

Surface intersections are collisions; periapsis below 150 km stops playback as outside the teaching model. The threshold does not model atmosphere or terrain. Gravity-assist speed changes are not propulsive Δv.

## 表示と計算の境界 / Display and calculation boundaries

初期条件と仮想時刻から同じ状態を再計算するため、シークの向きや画面更新速度で噴射が重複することはありません。表示軌跡は 181 点に制限され、再生を続けても点数は増えません。局所実験の表示期間は一周期または既定期間で、最大 12 時間です（スウィングバイは前後 2 時間）。

States are recomputed from initial conditions and simulated time. Seeking does not reapply burns. Paths contain 181 samples and do not accumulate during playback. Local displays cover at most 12 hours, with a separate four-hour flyby window.

局所軌道が実際のモデル半径の地表と交差する場合は、表示期間内で最初の衝突時刻を求めて描画・再生を止めます。安全高度の判定と地表衝突の判定は別です。不正な入力、対応範囲外、未収束では有効な成功結果を表示しません。

Physical surface crossings stop the local trajectory at the first impact within the display interval. Safety-altitude checks and surface collisions are distinct. Invalid or unsupported states and calculation failures do not produce a successful result.

## 固定定数と参考値 / Constants and reference values

太陽・地球の重力定数には DE440 系、火星には MAR097 由来の値を使います。これらを教材用の円軌道・半径と組み合わせた固定モデルであり、統一された精密実天体暦ではありません。各値の根拠は [出典一覧](SOURCES.md) に記載しています。

Sun and Earth gravitational parameters are based on DE440, while the Mars value comes from MAR097. Combined with the teaching radii and circular orbits, these define a fixed model rather than a unified precision ephemeris. See the [sources](SOURCES.md).

| 定数 / Constant                       |                 値 / Value |
| ------------------------------------- | -------------------------: |
| AU                                    |             149597870.7 km |
| 1 day                                 |                    86400 s |
| μ Sun                                 | 132712440041.279419 km³/s² |
| μ Earth                               |       398600.435507 km³/s² |
| μ Mars                                |         42828.37362 km³/s² |
| 地球円軌道半径 / Earth circular orbit |                       1 AU |
| 火星円軌道半径 / Mars circular orbit  |                1.523679 AU |
| 地球半径 / Earth radius               |                6378.137 km |
| 火星半径 / Mars radius                |                  3389.5 km |

| 参考条件での結果 / Reference result                         |     値 / Value |
| ----------------------------------------------------------- | -------------: |
| 飛行時間 / Flight time                                      |     258.8658 d |
| 出発時の火星先行角 / Mars departure phase                   |       44.3442° |
| 出発 v∞ / Departure v∞                                      |   2.94469 km/s |
| 到着 v∞ / Arrival v∞                                        |   2.64890 km/s |
| C3                                                          | 8.67119 km²/s² |
| 地球待機高度 200 km からの脱出 Δv / Escape from 200 km      |   3.61138 km/s |
| 火星高度 300 km の円軌道投入 Δv / Circularization at 300 km |   2.09138 km/s |
| 上記二噴射の合計 / Sum of the two modeled burns             |   5.70276 km/s |

これらは固定した教育モデルの計算値で、特定の実ミッションの実績ではありません。表示前の未丸め値を後段の計算に使います。合計 Δv に地表打上げ、待機軌道投入、損失、途中の修正噴射、予備は含みません。

These values belong to the fixed teaching model, not a real mission. Subsequent calculations use unrounded values. The Δv sum excludes surface launch, parking-orbit insertion, losses, corrections, and margins.

## 未対応範囲 / Outside scope

月への飛行、地表打上げ、大気抵抗、再突入、エアロブレーキ、有限燃焼、3次元の軌道面変更、多天体摂動、実天体暦、精密な作用圏接続、任意の複数噴射、複数惑星経由の自動最適化は扱いません。計算の精度確認は、これらの現実の効果を再現していることを意味しません。

Lunar flights, surface launch, atmosphere, re-entry, aerobraking, finite burns, 3D plane changes, multi-body perturbations, ephemerides, finite-sphere trajectory joins, arbitrary multiple burns, and multi-planet optimization are outside scope. Numerical verification does not add these omitted physical effects.

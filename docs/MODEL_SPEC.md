# 物理モデルと判定 / Physics model and evaluation

惑星航路ラボは、8惑星間と地球→月の理想化した遷移、および惑星近傍の独立した実験を使う軌道力学教材です。本書は太陽系航路モデル `circular-solar-lunar-1.0.0` と、5つの基礎実験のモデル `planar-two-body-1.0.0` の計算・表示・判定を説明します。定数の出典と参考資料は [SOURCES.md](SOURCES.md)、操作方法は [README](../README.md) にまとめています。

Planetary Route Lab teaches orbital mechanics through idealized transfers among eight planets, Earth-to-Moon transfer, and independent local experiments. This document covers the route model `circular-solar-lunar-1.0.0` and the five guided experiments using `planar-two-body-1.0.0`. See [sources](SOURCES.md) and the [user guide](../README.md).

**教育用の近似モデルです。実際の打上げ・探査機運用・航法には使用できません。 / Educational approximation; not for launch, spacecraft operations, or navigation.**

## モデルの範囲 / Scope

| 実験 / Lab                      | 座標の中心 / Center                                                     | 主な入力 / Inputs                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 太陽系の航路・惑星間 / Planetary routes | 太陽、出発・捕獲は各惑星 / Sun; each planet for local burns | 出発地・目的地・両高度・位相のずれ・待ち時間・捕獲噴射の割合 / Origin, destination, both altitudes, phase offset, wait, capture fraction |
| 太陽系の航路・月 / Lunar route | 地球、捕獲は月 / Earth; Moon for local capture | 地球待機高度・月到着高度・位相のずれ・待ち時間・捕獲噴射の割合 / Earth parking altitude, lunar arrival altitude, phase offset, wait, capture fraction |
| 軌道の基本 / Orbit basics       | 地球 / Earth                                                            | 待機高度、符号付き接線噴射 / Parking altitude, signed tangential burn                                       |
| 地球から出発 / Leave Earth      | 地球 / Earth                                                            | 待機高度、目標の超過速度 / Parking altitude, target excess speed                                            |
| 火星へ向かう / Journey to Mars  | 太陽 / Sun                                                              | 基準時刻の火星先行角、出発待ち時間 / Initial Mars lead angle, departure wait                                |
| 火星で止まる / Capture at Mars  | 火星 / Mars                                                             | 近火点高度、減速量 / Periapsis altitude, braking burn                                                       |
| スウィングバイ / Gravity assist | 地球、太陽中心の速度比較 / Earth, with Sun-relative velocity comparison | 接近速度、近点高度、入射方向、通過側 / Incoming speed, periapsis altitude, incoming direction, passing side |

共通の仮定は、2次元・同一平面・球対称の中心重力・二体問題・瞬時噴射です。惑星間の航路では各惑星を太陽中心の円軌道、月への航路では月を地球中心の円軌道で動かします。局所計算では対象の惑星または月だけの重力を使います。

All experiments assume planar two-body gravity and instantaneous burns. Planets follow circular Sun-centered orbits; the Moon follows a circular Earth-centered orbit. Local calculations use only the selected body's gravity.

遷移と出発・捕獲の局所計算は、有限の作用圏境界で接続した一本の航路ではありません。捕獲には位置が合う参考遷移の相対速度を使い、遷移で生じた位置のずれは修正しません。月の場合は地球・月・探査機の三体問題も解いていません。スウィングバイの基礎実験は、選択した直行航路に経由惑星を挿入する機能ではありません。

Transfer and local burn calculations are not joined at finite spheres of influence. Capture uses the aligned reference encounter's relative speed and cannot correct a transfer miss. The lunar route does not solve the Earth–Moon–spacecraft three-body problem. The guided gravity-assist lab does not add a waypoint to the selected direct route.

## 単位、座標、時間 / Units, frames, and time

内部単位は km、s、rad、km/s、km³/s² です。画面では必要に応じて AU、日、度へ変換します。中心距離 `r`、高度 `h`、天体半径 `R` は `r = R + h` の関係にあり、位置・速度ベクトルは表示中の中心天体に対する相対値です。比角運動量には高度と区別して `H` を使います。

Internal units are km, s, rad, km/s, and km³/s². Altitude is measured above the model surface, while radius is measured from the center. Displayed positions and velocities are relative to the stated central body.

- 惑星間実験の経過時間は出発から到着までです。待ち時間は出発前に両惑星を進め、出発方向を変えます。月への航路では地球待機円軌道上の探査機と月を進めます。 / Transfer elapsed time starts at departure. Waiting advances both planets, or the parking spacecraft and Moon in lunar mode.
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

## 太陽系の航路 / Solar system routes

水星・金星・地球・火星・木星・土星・天王星・海王星の異なる2惑星を、出発と到着の順序を区別して選べます。56通りの惑星間航路と地球→月の1通りを扱います。同じ天体への遷移、月からの出発、地球以外から月への遷移、他の衛星は対象外です。

The eight planets provide 56 ordered routes between distinct bodies, with one additional Earth → Moon route. Same-body transfers, departures from the Moon, routes to the Moon from other planets, and other moons are unsupported.

### 惑星間の共通式 / Shared planetary equations

出発・到着惑星の太陽中心の円軌道半径を $r_1,r_2$、太陽の重力定数を $\mu$ とします。外向き・内向きのどちらでも同じ式を用います。

Let $r_1,r_2$ be the circular heliocentric radii of the origin and destination, with solar gravitational parameter $\mu$. The equations apply to both outward and inward transfers.

$$
\begin{aligned}
a_T&=\frac{r_1+r_2}{2}, & e_T&=\frac{|r_2-r_1|}{r_1+r_2},\\
t_T&=\pi\sqrt{\frac{a_T^3}{\mu}}, & n_i&=\sqrt{\frac{\mu}{r_i^3}},\\
v_i&=\sqrt{\frac{\mu}{r_i}}, & v_{Ti}&=\sqrt{\mu\left(\frac{2}{r_i}-\frac{1}{a_T}\right)}.
\end{aligned}
$$

内側の惑星へ向かうときは $v_{T1}-v_1<0$ で、太陽中心の進行方向に対して減速します。局所噴射の計算には、相対速度の**大きさ** $v_{\infty,1}=|v_{T1}-v_1|$、$v_{\infty,2}=|v_2-v_{T2}|$ を使います。これらは接線方向が揃う参考遭遇の値です。

An inward transfer has $v_{T1}-v_1<0$: the spacecraft slows relative to heliocentric prograde motion. Local burn estimates use the magnitudes of the aligned-reference relative velocities. These positive magnitudes must not erase the sign of the heliocentric speed change.

各天体の中心から測った待機・目標円軌道半径を $\rho_i=R_i+h_i$、その天体の重力定数を $\mu_i$ とすると、参考の出発噴射と到着減速は次式です。

For local circular radii $\rho_i=R_i+h_i$ and body gravitational parameters $\mu_i$, the reference departure and capture burns are:

$$
\Delta v_i=\sqrt{v_{\infty,i}^2+\frac{2\mu_i}{\rho_i}}
-\sqrt{\frac{\mu_i}{\rho_i}}.
$$

合計は参考の2噴射 $\Delta v_1+\Delta v_2$ です。地表から待機軌道へ上がる噴射、損失、航路修正、予備は含みません。捕獲噴射の割合を変えた実験での噴射量は、参考の合計と区別して表示します。

The reference total is the sum of these two burns. It excludes surface launch, parking-orbit insertion, losses, corrections, and margins. An experiment with a different capture fraction has an applied burn separate from that reference total.

### 月への遷移 / Transfer to the Moon

月では $\mu=\mu_{Earth}$、$r_1=R_{Earth}+h_{depart}$、$r_2=384{,}400\ \mathrm{km}$ として半楕円を計算します。地球待機円軌道からの投入量は次式で、地球への束縛を保ったまま遠点を月の軌道まで上げます。

The lunar route uses Earth's gravitational parameter, the parking-orbit radius as $r_1$, and a fixed lunar radius of $384{,}400\ \mathrm{km}$ as $r_2$. Its departure burn raises the apoapsis while remaining bound to Earth:

$$
\Delta v_{depart}=\sqrt{\mu_{Earth}\left(\frac{2}{r_1}-\frac{1}{a_T}\right)}
-\sqrt{\frac{\mu_{Earth}}{r_1}}.
$$

この経路には地球脱出の $v_\infty$ を割り当てません。到着端での探査機と月の速度差を、別の月中心捕獲計算の近似的な超過速度として使います。月の重力による遷移途中の曲がり方や、作用圏境界での連続接続は計算していません。約5日はこの半楕円の飛行時間で、月ミッション全般の所要日数ではありません。

No Earth-escape $v_\infty$ is assigned to this bound route. The ideal endpoint's Moon-relative speed is used as an approximate excess speed in a separate lunar capture estimate. Lunar deflection during transfer and continuous sphere-of-influence joins are omitted. The roughly five-day time describes this half ellipse, not every lunar mission.

### 位相・待ち時間・遭遇 / Phase, wait, and encounter

参考位相は $\phi_{ref}=\pi-n_2t_T$ を一周以内に正規化した角度です。入力の位相のずれ $\Delta\phi$ と待ち時間 $t_w$ から、出発時の相対角を求めます。

The reference phase is $\phi_{ref}=\pi-n_2t_T$, wrapped to one revolution. The phase-offset input and waiting time produce the departure phase:

$$
\phi_{depart}=\left[\phi_{ref}+\Delta\phi+(n_2-n_1)t_w\right]\bmod 2\pi.
$$

月での $n_1$ は地球待機円軌道上の探査機の角速度です。出発方向は待機中の周回によって変わり、地球の自転角や地上の打上げ時刻ではありません。月の出発高度を変えると、飛行時間と参考位相も再計算します。

In lunar mode, $n_1$ is the parking spacecraft's angular rate. The departure ray follows its orbital motion, not Earth's rotation or a surface launch clock. Changing lunar departure altitude recalculates flight time and reference phase.

指定到着時刻での中心間のずれを $d=\lVert\mathbf r_{probe}-\mathbf r_{target}\rVert$ とし、惑星間は $10{,}000\ \mathrm{km}$、月は $1{,}000\ \mathrm{km}$ 以下を教材の遭遇判定とします。中心が一致する参考図は理想化で、天体内部へ向かう実航路ではありません。判定は捕獲成功や実際の接近可能性を保証しません。

At the prescribed arrival time, the center-distance miss is compared with a teaching tolerance of 10,000 km for planets or 1,000 km for the Moon. Coincident centers are an idealization, not an approach through the body. Passing this check does not establish capture or operational feasibility.

### 捕獲噴射と入力範囲 / Capture experiment and input bounds

捕獲噴射の割合 $f$ は0〜1.5で、1が参考の円軌道投入です。噴射直後の接線速度 $v_{after}=v_{before}-f\Delta v_2$ から軌道要素を再計算します。束縛されるか、教材の最低高度を満たすか、両近遠点の中心距離が目標半径の1%以内かを別に調べます。位置が合わない航路でも、この局所計算の入力は参考遭遇のままであり、その到着地点で捕獲したという意味にはなりません。

The capture fraction ranges from 0 to 1.5, with 1 giving the reference circularization burn. Post-burn orbital elements determine bound capture, minimum altitude, and whether both apsis radii are within 1% of the target. After a transfer miss, this independent local result still assumes the reference encounter and does not mean capture occurred at the missed position.

| 入力 / Input | 範囲 / Range |
| --- | --- |
| 出発・到着高度 / Both altitudes | 各天体の最低高度〜100,000 km / Body minimum to 100,000 km |
| 位相のずれ / Phase offset | −180°〜180° |
| 待ち時間 / Waiting | 0〜100,000 days |
| 捕獲噴射の割合 / Capture fraction | 0〜1.5 |
| 教材の最低高度 / Teaching minimum altitude | 地球150 km、月50 km、他の岩石惑星100 km、巨大惑星1,000 km / Earth 150 km, Moon 50 km, other rocky planets 100 km, giants 1,000 km |

巨大惑星の半径は赤道上の基準気圧面の値を球として使います。固い地表ではなく、扁平率・大気・環・磁気圏・放射線をモデル化していません。最低高度を満たしても、実際の周回軌道として安全・安定とは限りません。高い局所軌道についても、恒星・他の衛星の摂動による安定性判定は行いません。

Giant-planet radii represent equatorial reference pressure levels, treated as spheres. They are not solid surfaces. Oblateness, atmosphere, rings, magnetospheres, and radiation are omitted. Minimum altitude does not ensure real orbital safety or stability; stellar and satellite perturbations are also omitted at high local altitudes.

## 基礎実験：地球から火星への遷移 / Guided Earth-to-Mars transfer

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

## 基礎実験：地球脱出と火星捕獲 / Guided escape and capture

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

## 基礎実験：スウィングバイ / Guided gravity assist

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

基礎実験で局所軌道が実際のモデル半径の地表と交差する場合は、表示期間内で最初の衝突時刻を求めて描画・再生を止めます。最低高度の判定と地表衝突の判定は別です。太陽系の航路で表示する捕獲判定は噴射直後の軌道要素によります。不正な入力、対応範囲外、未収束では有効な成功結果を表示しません。

Guided local experiments stop at the first physical surface crossing within the display interval. Minimum-altitude checks and surface collisions are distinct. Solar system route capture results are based on post-burn orbital elements. Invalid or unsupported states and calculation failures do not produce a successful result.

## 固定定数と参考値 / Constants and reference values

太陽・地球などのDE440系の重力定数と、JPL NAIFが提供する惑星単体の重力定数を使います。火星は基礎実験と共通のMAR097由来の丸め値です。これらを教材用の円軌道・半径と組み合わせた固定モデルであり、統一された精密実天体暦ではありません。9天体の全定数と採用理由は [出典一覧](SOURCES.md) に記載しています。以下は共通定数と地球→火星の参考値です。

The model combines DE440-based constants with planet-only GMs from JPL NAIF. Mars retains the guided labs' rounded MAR097 value. These constants, teaching radii, and circular orbits define a fixed model rather than a unified precision ephemeris. All nine bodies and provenance are listed in the [sources](SOURCES.md). Common constants and Earth-to-Mars reference values follow.

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

地球待機高度200 km、月の目標高度100 km、位相のずれ・待ち時間0、捕獲噴射の割合1における月への参考値です。

Lunar reference values use a 200 km Earth parking orbit, a 100 km lunar target circle, zero phase offset and waiting time, and capture fraction 1.

| 月への参考値 / Lunar reference | 値 / Value |
| --- | ---: |
| 飛行時間 / Flight time | 4.977955 d |
| 出発時の月先行角 / Moon departure phase | 114.71985° |
| 地球待機軌道からの投入 / Earth parking-orbit injection | 3.131345 km/s |
| 参考到着端の月相対速度 / Ideal endpoint Moon-relative speed | 0.831507 km/s |
| 独立近似による月円軌道投入 / Independent lunar circularization estimate | 0.821710 km/s |
| 上記二噴射の参考合計 / Reference sum of the two burns | 3.953055 km/s |

これらは固定した教育モデルの計算値で、特定の実ミッションの実績ではありません。表示前の未丸め値を後段の計算に使います。合計 Δv に地表打上げ、待機軌道投入、損失、途中の修正噴射、予備は含みません。

These values belong to the fixed teaching model, not a real mission. Subsequent calculations use unrounded values. The Δv sum excludes surface launch, parking-orbit insertion, losses, corrections, and margins.

## 未対応範囲 / Outside scope

月からの出発、地球以外から月への遷移、他の衛星・準惑星、地表打上げ、大気抵抗、再突入、エアロブレーキ、有限燃焼、3次元の軌道面変更、多天体摂動、実天体暦、精密な作用圏接続、任意の複数噴射、複数惑星経由の自動最適化は扱いません。計算の精度確認は、これらの現実の効果を再現していることを意味しません。

Departures from the Moon, non-Earth origins for lunar routes, other moons and dwarf planets, surface launch, atmosphere, re-entry, aerobraking, finite burns, 3D plane changes, multi-body perturbations, ephemerides, finite-sphere trajectory joins, arbitrary multiple burns, and multi-planet optimization are outside scope. Numerical verification does not add these omitted physical effects.

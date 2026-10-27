/** Original bilingual teaching copy. Numbers describe the bundled ideal model. */
export type Lang = "ja" | "en";
export type LabId = "basics" | "escape" | "transfer" | "capture" | "flyby";
export type Localized<T = string> = { ja: T; en: T };

export interface Lesson {
  id: LabId;
  number: string;
  title: Localized;
  subtitle: Localized;
  question: Localized;
  prediction: Localized<string[]>;
  answer: number;
  predictionFeedback: Localized;
  steps: Localized<string[]>;
  hints: Localized<string[]>;
  explanation: Localized;
  formula: string;
  assumptions: Localized;
}

export const LABS: Lesson[] = [
  {
    id: "basics",
    number: "01",
    title: { ja: "軌道の基本", en: "Orbit basics" },
    subtitle: {
      ja: "速さを変えると、道が変わる。",
      en: "Change your speed. Change your orbit.",
    },
    question: {
      ja: "円軌道で進行方向へ少し加速すると、どこが高くなる？",
      en: "After a small prograde burn from a circular orbit, which part rises?",
    },
    prediction: {
      ja: [
        "噴射した場所だけ",
        "噴射した場所の反対側",
        "円の形を保ったまま全体",
      ],
      en: [
        "Only the burn location",
        "The opposite side of the orbit",
        "The whole orbit remains circular and rises",
      ],
    },
    answer: 1,
    predictionFeedback: {
      ja: "位置は噴射の瞬間には変わりません。小さな順行噴射では、反対側が遠点になる楕円軌道へ変わります。",
      en: "A burn changes velocity instantly, not position. A small prograde burn creates an ellipse with its highest point on the opposite side.",
    },
    steps: {
      ja: [
        "噴射量を0 km/sにして、円軌道の高度と速さを確認する。",
        "順行噴射を+0.5 km/sにして、軌道の反対側が高くなるか比べる。",
        "遠点へ時間を進め、高度と速さを比較する。逆行噴射も試す。",
      ],
      en: [
        "Set the burn to 0 km/s and note the circular orbit’s altitude and speed.",
        "Apply a +0.5 km/s prograde burn and compare the opposite side’s altitude.",
        "Move forward to apoapsis; compare altitude and speed. Then try a retrograde burn.",
      ],
    },
    hints: {
      ja: [
        "噴射地点では、位置は連続したまま速度だけが変わります。",
        "同じ楕円軌道では、中心天体に近いときほど速く動きます。",
        "速度を下げすぎると近点が地表に入り、束縛軌道でも安全ではありません。",
      ],
      en: [
        "At the burn point, position stays continuous while velocity changes.",
        "On the same ellipse, motion is faster closer to the central body.",
        "Too much braking can put periapsis below the surface. A bound orbit is not necessarily safe.",
      ],
    },
    explanation: {
      ja: "宇宙機は噴射の後も重力で曲がり続けます。進行方向への噴射で軌道エネルギーが増え、逆向きの噴射で減ります。十分な速さになると閉じた楕円を離れ、脱出軌道になります。",
      en: "Gravity keeps bending the trajectory after a burn. A prograde burn adds orbital energy; a retrograde burn removes it. With enough speed, the closed ellipse becomes an escape trajectory.",
    },
    formula:
      "v_c = √(μ/r)\nv_esc = √(2μ/r)\nε = |v|²/2 − μ/r\nv² = μ(2/r − 1/a)",
    assumptions: {
      ja: "地球中心の二体問題。噴射は初期位置で一度だけ、接線方向へ瞬時に適用します。空気抵抗・地球の扁平率・月の重力は含みません。",
      en: "An Earth-centered two-body model with one instantaneous tangential burn at the initial position. Atmospheric drag, Earth’s oblateness, and lunar gravity are omitted.",
    },
  },
  {
    id: "escape",
    number: "02",
    title: { ja: "地球から出発", en: "Leave Earth" },
    subtitle: {
      ja: "地球の重力を抜け出そう。",
      en: "Climb out of Earth’s gravity well.",
    },
    question: {
      ja: "同じv∞を目指すとき、待機高度を200 kmから1,000 kmへ変えると脱出噴射のΔvは？",
      en: "For the same v∞, how does the escape burn change from a 200 km to a 1,000 km parking orbit?",
    },
    prediction: {
      ja: [
        "この条件では小さくなる",
        "必ず同じになる",
        "この条件では大きくなる",
      ],
      en: [
        "It decreases for these settings",
        "It must stay the same",
        "It increases for these settings",
      ],
    },
    answer: 0,
    predictionFeedback: {
      ja: "参考のv∞では、1,000 kmからの脱出噴射は小さくなります。ただし、高い待機軌道を作るための噴射はこの比較に含まれません。",
      en: "At the reference v∞, the escape burn is smaller from 1,000 km. This comparison excludes the burns needed to reach that higher parking orbit.",
    },
    steps: {
      ja: [
        "参考設定で、高度200 kmの円軌道速度と脱出速度を読む。",
        "v∞を変えず、待機高度を1,000 kmへ変更する。",
        "必要Δvを参考値と比較し、次にv∞だけを増やしてみる。",
      ],
      en: [
        "Start from the reference 200 km altitude and read circular and escape speeds.",
        "Keep v∞ fixed and change parking altitude to 1,000 km.",
        "Compare the required Δv with the reference, then increase only v∞.",
      ],
    },
    hints: {
      ja: [
        "高度hと中心距離rは違います。r = 地球半径 + hです。",
        "v∞は地球から十分遠方での相対速度。近地地点の速さではありません。",
        "円軌道から必要な速さまでの差が、ここで使う噴射Δvです。",
      ],
      en: [
        "Altitude h differs from center distance r: r = Earth radius + h.",
        "v∞ is the Earth-relative speed far away, not the speed at periapsis.",
        "The difference between circular speed and the required local speed is the burn Δv.",
      ],
    },
    explanation: {
      ja: "脱出速度は、遠方で速さが0に近づく境界です。火星へ向かう参考設定では、さらに地球相対のv∞ ≈ 2.94469 km/sを残します。高度200 kmの円軌道からの脱出噴射は約3.61138 km/sです。",
      en: "Escape speed is the boundary that leaves zero speed at infinity. The reference Mars transfer requires an additional Earth-relative v∞ of about 2.94469 km/s. From a 200 km circular orbit, the burn is about 3.61138 km/s.",
    },
    formula:
      "r = R_Earth + h\nv_c = √(μ_Earth/r)\nv_p = √(v∞² + 2μ_Earth/r)\nΔv = v_p − v_c\nC3 = v∞²",
    assumptions: {
      ja: "独立した地球中心の局所実験。参考v∞は理想ホーマン遷移の値です。地表からの打上げ・待機軌道への投入は計算外で、惑星間航路に連続接続した解ではありません。",
      en: "An independent Earth-centered local experiment. Reference v∞ comes from the ideal Hohmann transfer. Launch and parking-orbit insertion are excluded; this is not a continuously connected interplanetary trajectory.",
    },
  },
  {
    id: "transfer",
    number: "03",
    title: { ja: "火星へ向かう", en: "Journey to Mars" },
    subtitle: {
      ja: "目指すのは、未来の火星。",
      en: "Aim for where Mars will be.",
    },
    question: {
      ja: "火星へ着くためには、どこを目指せばよい？",
      en: "To meet Mars, where should the spacecraft aim?",
    },
    prediction: {
      ja: [
        "出発する瞬間の火星",
        "火星の公転軌道上ならどこでも",
        "到着する時刻の火星",
      ],
      en: [
        "Mars at the moment of departure",
        "Anywhere on Mars’s orbit",
        "Mars at the arrival time",
      ],
    },
    answer: 2,
    predictionFeedback: {
      ja: "宇宙機の飛行中にも火星は公転します。約259日後に、宇宙機と火星が同じ場所へ着く必要があります。",
      en: "Mars keeps moving while the spacecraft travels. Both must reach the same place at the same time, about 259 days after departure in this model.",
    },
    steps: {
      ja: [
        "参考設定で再生し、到着時の宇宙機と火星を見比べる。",
        "火星先行角を少しずらして、到着点のずれを確認する。",
        "先行角を調整し、到着時の誤差距離を10,000 km以下にする。",
      ],
      en: [
        "Play the reference and compare the spacecraft and Mars at arrival.",
        "Change Mars’s lead angle slightly and inspect the arrival miss distance.",
        "Adjust the angle until the miss distance at arrival is at most 10,000 km.",
      ],
    },
    hints: {
      ja: [
        "軌道の線が交差しても、その時刻に火星がいなければ遭遇しません。",
        "参考の先行角は約44.3442°。丸めた角度ではわずかな誤差が残ります。",
        "出発待ち時間を変えると、地球と火星の両方が公転して出発時の位置関係が変わります。",
      ],
      en: [
        "Crossing Mars’s orbit is not an encounter unless Mars is there at that time.",
        "The reference lead angle is about 44.3442°. A rounded angle leaves a small residual error.",
        "Waiting changes both Earth’s and Mars’s positions, so it also changes their relative angle at departure.",
      ],
    },
    explanation: {
      ja: "ホーマン遷移では、地球の公転軌道と火星の公転軌道に接する楕円の半周を飛びます。飛行時間は約258.8658日。到着時に火星が待ち合わせ地点へ来るよう、出発時の先行角を選びます。",
      en: "A Hohmann transfer follows half an ellipse tangent to the circular orbits of Earth and Mars. The flight takes about 258.8658 days. The departure lead angle makes Mars reach the rendezvous point at arrival.",
    },
    formula:
      "a_T = (r_Earth + r_Mars)/2\nt_T = π√(a_T³/μ_Sun)\nn_Mars = √(μ_Sun/r_Mars³)\nφ = π − n_Mars t_T\nd(t_T) = |r_spacecraft(t_T) − r_Mars(t_T)|",
    assumptions: {
      ja: "太陽中心・同一平面・惑星の円軌道。10,000 kmは教材の遭遇許容誤差で、捕獲条件ではありません。中心位置の一致は理想化であり、火星中心へ突入する実航路でも実暦の打上げ窓でもありません。",
      en: "Sun-centered, coplanar motion with circular planetary orbits. The 10,000 km encounter tolerance is a teaching criterion, not capture. Coincident centers are an idealization, not a real route into Mars or a calendar launch window.",
    },
  },
  {
    id: "capture",
    number: "04",
    title: { ja: "火星で止まる", en: "Capture at Mars" },
    subtitle: {
      ja: "着くだけでは、周回できない。",
      en: "Arriving is only the beginning.",
    },
    question: {
      ja: "火星の近くへ来た宇宙機は、噴射しなくても周回軌道に入る？",
      en: "Will an arriving spacecraft enter Mars orbit without a burn?",
    },
    prediction: {
      ja: [
        "重力があるので必ず入る",
        "この二体モデルでは飛び去る",
        "近火点高度だけで決まる",
      ],
      en: [
        "Yes, gravity always captures it",
        "It flies past in this two-body model",
        "Only periapsis altitude determines capture",
      ],
    },
    answer: 1,
    predictionFeedback: {
      ja: "双曲線で到着した宇宙機は、重力だけでは軌道エネルギーを失いません。このモデルでは減速噴射が必要です。",
      en: "An incoming hyperbolic trajectory does not lose orbital energy through gravity alone. A braking burn is needed in this model.",
    },
    steps: {
      ja: [
        "近火点高度300 km、減速量0 km/sでフライバイを確認する。",
        "減速量を増やして、双曲線から束縛された楕円へ変わるところを探す。",
        "参考の約2.09138 km/sへ合わせ、安全な高度300 kmの円軌道と比較する。",
      ],
      en: [
        "At 300 km periapsis altitude, set braking to 0 km/s and inspect the flyby.",
        "Increase braking and find the transition from a hyperbola to a bound ellipse.",
        "Try the reference burn of about 2.09138 km/s and compare with the safe 300 km circular orbit.",
      ],
    },
    hints: {
      ja: [
        "火星へ近づくほど速くなります。到着v∞と近火点速度は違います。",
        "比軌道エネルギーが負になると束縛されます。ただし安全かどうかは別に確認します。",
        "減速しすぎると、噴射地点が遠点となり、その後の近点が地表へ入ることがあります。",
      ],
      en: [
        "The spacecraft speeds up as it approaches Mars. Arrival v∞ differs from periapsis speed.",
        "Negative specific orbital energy means a bound orbit, but safety must be checked separately.",
        "Excess braking can make the burn point apoapsis and put the new periapsis below the surface.",
      ],
    },
    explanation: {
      ja: "捕獲では、火星に対する軌道エネルギーを噴射で減らします。遭遇、束縛軌道への捕獲、安全な目標軌道の達成は別の判定です。参考では、全軌道が高度100 km以上で、近点・遠点の中心距離が目標円軌道半径の1%以内なら目標達成です。",
      en: "Capture removes Mars-relative orbital energy with a burn. Encounter, bound capture, and a safe target orbit are separate checks. The target requires altitude of at least 100 km everywhere and periapsis and apoapsis radii within 1% of the target circular radius.",
    },
    formula:
      "r_p = R_Mars + h_p\nv_p = √(v∞² + 2μ_Mars/r_p)\nv_c = √(μ_Mars/r_p)\nΔv_circular = v_p − v_c\nε_after = |v_after|²/2 − μ_Mars/r_p",
    assumptions: {
      ja: "独立した火星中心の局所実験。参考ホーマン遷移の到着v∞を使い、指定近火点で接線方向に瞬時減速します。ここで捕獲できても、惑星間遷移の位置のずれは修正されません。安全高度100 kmは教材上の制約です。",
      en: "An independent Mars-centered experiment using reference Hohmann arrival v∞ and instantaneous tangential braking at the selected periapsis. Local capture does not correct an interplanetary miss. The 100 km safety altitude is a teaching constraint.",
    },
  },
  {
    id: "flyby",
    number: "05",
    title: { ja: "スウィングバイ", en: "Gravity assist" },
    subtitle: {
      ja: "惑星の動きを、味方にする。",
      en: "Borrow momentum from a moving planet.",
    },
    question: {
      ja: "無噴射のスウィングバイで、変わらない速さはどれ？",
      en: "Which speed stays the same in an unpowered gravity assist?",
    },
    prediction: {
      ja: [
        "太陽から見た入出の速さ",
        "接近中のすべての瞬間の速さ",
        "惑星から十分遠い入出の相対速度の大きさ",
      ],
      en: [
        "Incoming and outgoing Sun-relative speeds",
        "The speed at every moment during approach",
        "The incoming and outgoing planet-relative speeds far away",
      ],
    },
    answer: 2,
    predictionFeedback: {
      ja: "惑星中心では、遠方の入出の|v∞|が等しくなります。近点では速くなり、太陽中心では惑星の公転速度とのベクトル合成で加速も減速も起こります。",
      en: "In the planet frame, the incoming and outgoing |v∞| values are equal far away. Speed rises near periapsis. In the Sun frame, vector addition with the planet’s velocity can produce either acceleration or deceleration.",
    },
    steps: {
      ja: [
        "入射方向、v∞、近点高度を固定して、入出の速度ベクトルを見る。",
        "通過側を切り替え、太陽中心速度の増減を比較する。",
        "近点高度かv∞を増やし、旋回角がどう変わるか確かめる。",
      ],
      en: [
        "Fix incoming direction, v∞, and periapsis altitude; inspect the velocity vectors.",
        "Switch the passing side and compare the change in Sun-relative speed.",
        "Increase periapsis altitude or v∞ and observe the change in turn angle.",
      ],
    },
    hints: {
      ja: [
        "速度は向きのある量です。速さが同じでも、方向が変われば別の速度です。",
        "太陽中心の速度は「惑星の公転速度＋惑星相対速度」です。",
        "同じ近点なら速い接近ほど曲がりにくく、同じv∞なら遠い通過ほど曲がりにくくなります。",
      ],
      en: [
        "Velocity has direction. Equal speeds can still represent different velocities.",
        "Sun-relative velocity equals planetary velocity plus planet-relative velocity.",
        "At the same periapsis, faster approaches turn less. At the same v∞, more distant passes turn less.",
      ],
    },
    explanation: {
      ja: "スウィングバイは、動いている惑星との運動エネルギー交換です。エネルギーを無から作るわけではありません。太陽中心での速さの変化は、噴射で消費したΔvには加算しません。曲がれる角度には、接近条件による上限があります。",
      en: "A gravity assist exchanges kinetic energy with a moving planet; it does not create energy from nothing. The change in Sun-relative speed is not propulsive Δv. The encounter conditions limit how far the trajectory can turn.",
    },
    formula:
      "r_p = R_Planet + h_p\ne = 1 + r_p v∞²/μ_Planet\nδ = 2 asin(1/e)\nv∞_out = Rotate(±δ) v∞_in\nv_Sun = v_Planet + v∞",
    assumptions: {
      ja: "地球を使う独立した無推力の双曲線遭遇実験。太陽中心図は遠方の速度ベクトルの合成を表します。地表以下は衝突、高度150 km未満は教材の範囲外。火星直行航路に経由地点を追加する機能ではありません。",
      en: "An independent, unpowered hyperbolic Earth encounter. The Sun-frame diagram adds far-field velocity vectors. Surface intersections are collisions; altitudes below 150 km are outside this model. This does not insert a waypoint into the direct Mars transfer.",
    },
  },
];

interface Manual {
  title: string;
  intro: string;
  sections: { title: string; body: string }[];
}

export const manual: Localized<Manual> = {
  ja: {
    title: "惑星航路ラボの使い方",
    intro:
      "予想して、条件を一つ変えて、結果を比べる。数式が分からなくても、軌道の形と動きから学べます。",
    sections: [
      {
        title: "まずは火星へ",
        body: "「火星へ向かう」で参考設定を再生します。約259日後に宇宙機と火星が同じ場所へ来る様子を確認し、先行角を少し変えて再実行します。いつでも「参考設定へ戻す」で検証済みの条件に戻せます。",
      },
      {
        title: "時間を動かす",
        body: "再生・一時停止、最初へ戻る、1ステップ、イベントへの移動、時間スライダーを使えます。倍率は実時間1秒あたりの仮想時間です。地球脱出・火星捕獲・スウィングバイには独立した局所時計があり、惑星間飛行の時刻とはつながっていません。",
      },
      {
        title: "条件を変えて比較する",
        body: "スライダーまたは隣の数値入力で変更します。単位を確認し、一度に一つの条件を変えましょう。参考軌道の重ね合わせで違いを比べられます。条件変更後は初期時刻から計算し直します。無効な入力は表示された範囲内へ直してください。",
      },
      {
        title: "5つの実験",
        body: "軌道の基本：噴射量0と+0.5 km/sを比較。地球から出発：v∞を固定し待機高度200と1,000 kmを比較。火星へ向かう：到着時のずれを10,000 km以下に調整。火星で止まる：減速0と約2.09138 km/sを比較。スウィングバイ：他の条件を固定して通過側を切り替えます。",
      },
      {
        title: "計算の流れと比較",
        body: "各章の計算欄で、入力値・式への代入・結果・参考設定との差を順に確認できます。試す例を選ぶと条件と参考軌道の表示が切り替わります。火星への遷移では到着時点を表示します。先行角や待ち時間で遭遇位置は変わりますが、このホーマン遷移の飛行時間は変わりません。月への飛行は現在の計算対象に含まれません。",
      },
      {
        title: "何をもって成功とする？",
        body: "惑星間の遭遇は、規定の到着時刻で位置のずれが10,000 km以下という教材上の判定です。火星の目標円軌道は、束縛され、全軌道の高度が100 km以上、近点・遠点の中心距離が目標半径の1%以内で判定します。局所実験の成功で、惑星間の非遭遇が修正されることはありません。",
      },
      {
        title: "図と数値の読み方",
        body: "座標の中心天体、距離と時間の単位を確認してください。天体や宇宙機のアイコンは実寸ではありません。太陽中心の全体図と惑星中心の実験は別の縮尺です。v∞は遠方の惑星相対速度、C3はその2乗、Δvは噴射による速度変化で、それぞれ別の量です。",
      },
      {
        title: "キーボードと表示設定",
        body: "Tabで操作項目へ移動し、ボタンはEnterまたはSpace、スライダーは矢印キーで操作できます。数値入力も利用できます。自動再生はせず、動きを減らす設定でも静止軌跡とステップ操作で学べます。上部で日本語／英語とライト／ダークを切り替えられます。",
      },
      {
        title: "計算の範囲",
        body: "2次元・同一平面・円軌道の惑星・二体重力・瞬時噴射を仮定します。局所実験は有限の作用圏境界で接続した一本の航路ではありません。大気、地表打上げ、軌道面変更、多天体の重力、実暦の精密な打上げ窓は扱いません。安全高度は実運用の基準ではありません。",
      },
      {
        title: "この教材について",
        body: "JPL由来の固定定数と教材用の半径を使い、外部APIなしで計算します。表示を丸める前の値で計算を続けます。教育用の近似モデルであり、実際の打上げ・探査機運用・航法には使用できません。数式と仮定は各章の詳細表示で確認できます。",
      },
    ],
  },
  en: {
    title: "Planetary Route Lab guide",
    intro:
      "Predict, change one setting, and compare. You can learn from orbital shapes and motion before learning the equations.",
    sections: [
      {
        title: "Start with Mars",
        body: "Play the reference in Journey to Mars. Watch the spacecraft and Mars meet after about 259 days. Change the lead angle slightly and try again. Restore reference returns to the verified settings at any time.",
      },
      {
        title: "Control time",
        body: "Use play/pause, restart, one step, event jumps, and the time slider. Playback speed states how much simulated time passes per real second. Earth escape, Mars capture, and gravity assist have independent local clocks; these are not the interplanetary mission clock.",
      },
      {
        title: "Change and compare",
        body: "Use a slider or its adjacent number input. Check units and change one condition at a time. Overlay the reference orbit to compare. Changing a condition recalculates from the initial time. Correct invalid inputs using the displayed range.",
      },
      {
        title: "Five experiments",
        body: "Orbit basics: compare burns of 0 and +0.5 km/s. Leave Earth: fix v∞ and compare parking altitudes of 200 and 1,000 km. Journey to Mars: bring the arrival miss distance below 10,000 km. Capture at Mars: compare braking of 0 and about 2.09138 km/s. Gravity assist: keep other conditions fixed and switch passing side.",
      },
      {
        title: "Follow the calculation",
        body: "Each lab shows inputs, numerical substitution, results, and differences from the reference. Choose an example to apply its settings and show the reference overlay. Transfer examples jump to arrival. Phase and waiting time change the encounter geometry, not this Hohmann transfer’s flight duration. Lunar flights are not included in the current model.",
      },
      {
        title: "What counts as success?",
        body: "An interplanetary encounter means a miss distance no greater than 10,000 km at the prescribed arrival time: a teaching criterion. The Mars circular target must be bound, stay at least 100 km above the surface, and have periapsis and apoapsis radii within 1% of the target radius. Local success never corrects an interplanetary miss.",
      },
      {
        title: "Read the diagram and values",
        body: "Check the central body and distance/time units. Body and spacecraft icons are not to scale. Sun-centered and local planetary views use different scales. v∞ is the far-field planet-relative speed; C3 is its square; Δv is the velocity change from a burn. They are different quantities.",
      },
      {
        title: "Keyboard and display",
        body: "Tab moves between controls. Use Enter or Space on buttons and arrow keys on sliders; number inputs also work. Nothing autoplays. Static trajectories and step controls remain useful with reduced motion enabled. Switch Japanese/English and light/dark appearance at the top.",
      },
      {
        title: "Model limits",
        body: "The model assumes two dimensions, one plane, circular planetary orbits, two-body gravity, and instantaneous burns. Local labs are not joined into one trajectory at finite spheres of influence. Atmospheres, surface launch, plane changes, multiple-body gravity, and precise calendar launch windows are omitted. Safety altitudes are not operational limits.",
      },
      {
        title: "About this lesson",
        body: "Calculations use bundled JPL-derived constants and teaching-model radii without an external API. Unrounded values feed later calculations. This is an educational approximation and cannot be used for actual launch, spacecraft operations, or navigation. Open each chapter’s details to inspect its equations and assumptions.",
      },
    ],
  },
};

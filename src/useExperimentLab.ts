import { useCallback, useEffect, useMemo, useState } from "react";
import { usePauseWhenHidden } from "./hooks";
import {
  describeOutcome,
  labMetrics,
  labStartTime,
  nextLab,
} from "./labOutcome";
import { LABS } from "./learning";
import type { LabId, Lang } from "./learning";
import type { Layers } from "./OrbitDiagram";
import { K } from "./physics";
import { H, defaults, simulate } from "./simulation";
import type { Parameters } from "./simulation";

export type Frame = "planet" | "sun";

const allDefaults = () =>
  Object.fromEntries(LABS.map((l) => [l.id, defaults(l.id)])) as Record<
    LabId,
    Parameters
  >;

/**
 * State and derived values for the five guided experiments.
 *
 * Settings for every lab are kept here (not inside the lab view) so that
 * switching to the solar-system routes and back preserves the experiment.
 */
export function useExperimentLab(lang: Lang) {
  const [lab, setLab] = useState<LabId>("transfer");
  const [settings, setSettings] = useState(allDefaults);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(20);
  const [frame, setFrame] = useState<Frame>("planet");
  const [layers, setLayers] = useState<Layers>({
    vectors: false,
    trail: true,
    predicted: true,
    markers: true,
    reference: false,
  });
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  /** Bumped whenever inputs change from outside the fields, to remount them. */
  const [revision, setRevision] = useState(0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [hint, setHint] = useState(0);
  const [evaluated, setEvaluated] = useState(false);
  const [completed, setCompleted] = useState<LabId[]>([]);
  const [visitedSides, setVisitedSides] = useState<number[]>([1]);

  const p = settings[lab];
  const lesson = LABS.find((l) => l.id === lab)!;
  const isMission = lab === "transfer";
  const result = useMemo(() => {
    try {
      return simulate(lab, p);
    } catch {
      return null;
    }
  }, [lab, p]);
  const reference = useMemo(() => simulate(lab, defaults(lab)), [lab]);
  const valid = result !== null && !Object.values(invalid).some(Boolean);
  const sim = valid ? result : null;
  const now = sim ? Math.max(sim.start, Math.min(sim.end, time)) : 0;
  const displayable = sim !== null && !sim.blocked;
  const current = displayable ? sim.at(now) : null;
  const timeScale = isMission ? K.DAY : 3600;

  const pause = useCallback(() => setPlaying(false), []);
  usePauseWhenHidden(pause);
  useEffect(() => {
    if (!playing || !sim) return;
    let id = 0;
    let last: number | undefined;
    const tick = (stamp: number) => {
      if (last !== undefined) {
        const dt = ((stamp - last) / 1000) * rate * (isMission ? K.DAY : 60);
        setTime((t) => {
          const next = Math.min(t + dt, sim.end);
          if (next >= sim.end) setPlaying(false);
          return next;
        });
      }
      last = stamp;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, sim, rate, isMission]);

  const outcome = useMemo(
    () => describeOutcome({ lab, p, sim, visitedSides, lang }),
    [lab, p, sim, visitedSides, lang],
  );
  const metrics = useMemo(
    () =>
      sim && !sim.blocked ? labMetrics({ lab, p, sim, reference, lang }) : [],
    [lab, p, sim, reference, lang],
  );

  const rewind = useCallback((id: LabId) => {
    setTime(labStartTime(id));
    setPlaying(false);
    setEvaluated(false);
  }, []);
  const changeLab = useCallback(
    (id: LabId) => {
      setLab(id);
      rewind(id);
      setInvalid({});
      setPrediction(null);
      setHint(0);
      setFrame("planet");
      setRevision((r) => r + 1);
    },
    [rewind],
  );
  const change = (key: keyof Parameters, value: number) => {
    setSettings((s) => ({ ...s, [lab]: { ...s[lab], [key]: value } }));
    rewind(lab);
    if (key === "side") setVisitedSides((s) => [...new Set([...s, value])]);
    else if (lab === "flyby") setVisitedSides([p.side]);
  };
  const reset = () => {
    setSettings((s) => ({ ...s, [lab]: defaults(lab) }));
    setInvalid({});
    setRevision((r) => r + 1);
    rewind(lab);
    if (lab === "flyby") setVisitedSides([1]);
  };
  const applyExample = (patch: Partial<Parameters>) => {
    setSettings((s) => ({ ...s, [lab]: { ...s[lab], ...patch } }));
    setInvalid({});
    setRevision((r) => r + 1);
    rewind(lab);
    if (isMission) setTime(H.flightTime);
    setLayers((s) => ({ ...s, reference: true }));
    if (lab === "flyby") {
      const side = patch.side ?? p.side;
      const onlySide = Object.keys(patch).every((key) => key === "side");
      setVisitedSides((s) => (onlySide ? [...new Set([...s, side])] : [side]));
    }
  };
  const setFieldValidity = (key: keyof Parameters, ok: boolean) => {
    setInvalid((s) => (s[key] === !ok ? s : { ...s, [key]: !ok }));
    if (!ok) setPlaying(false);
  };
  const seek = (value: number) => {
    setTime(value);
    setPlaying(false);
  };
  const step = () => {
    if (sim) setTime((t) => Math.min(sim.end, t + (sim.end - sim.start) / 100));
  };
  const togglePlay = () => {
    if (sim && now >= sim.end) setTime(sim.start);
    setPlaying((v) => !v);
  };
  const toggleLayer = (key: keyof Layers, on: boolean) =>
    setLayers((s) => ({ ...s, [key]: on }));
  const choosePrediction = (index: number) => {
    setPrediction(index);
    setEvaluated(false);
  };
  const revealHint = () =>
    setHint((h) => Math.min(h + 1, lesson.hints[lang].length));
  const evaluate = () => {
    setEvaluated(true);
    if (outcome.good && prediction === lesson.answer)
      setCompleted((s) => (s.includes(lab) ? s : [...s, lab]));
  };
  /** Uses the last computed model even while the burn draft is invalid, so the preset can repair it. */
  const setCircularizationBurn = () => {
    if (!result) return;
    change("burn", result.captureResult.circularDeltaV);
    setInvalid({});
    setRevision((r) => r + 1);
  };

  return {
    lab,
    lesson,
    p,
    sim,
    /** The model for the current settings, even while a field draft is invalid. */
    model: result,
    reference,
    valid,
    displayable,
    current,
    now,
    timeScale,
    isMission,
    playing,
    rate,
    frame,
    layers,
    invalid,
    revision,
    prediction,
    hint,
    evaluated,
    completed,
    outcome,
    metrics,
    next: nextLab(lab),
    changeLab,
    change,
    reset,
    applyExample,
    setFieldValidity,
    seek,
    step,
    pause,
    togglePlay,
    setRate,
    setFrame,
    toggleLayer,
    choosePrediction,
    revealHint,
    evaluate,
    setCircularizationBurn,
  };
}

export type ExperimentLabState = ReturnType<typeof useExperimentLab>;

import { memo, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./MathFormula.css";

interface MathFormulaProps {
  tex: string;
  display?: boolean;
  className?: string;
}

/** Render the project's TeX with visual HTML and accessible MathML. */
export default memo(function MathFormula({
  tex,
  display = true,
  className = "",
}: MathFormulaProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        output: "htmlAndMathml",
        throwOnError: false,
        strict: "error",
        trust: false,
      }),
    [tex, display],
  );
  const Element = display ? "div" : "span";
  return (
    <Element
      className={`math-formula ${display ? "math-formula-display" : "math-formula-inline"} ${className}`}
      tabIndex={display ? 0 : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

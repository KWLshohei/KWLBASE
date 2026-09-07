import React, { Suspense, lazy } from "react";
import { C } from "../theme.js";

/* recharts は初期表示に不要なので、チャート描画時にだけ読み込む */
const Chart = lazy(() => import("./FlavorRadarChart.jsx"));

function Placeholder({ height }) {
  return (
    <div
      style={{
        height,
        display: "grid",
        placeItems: "center",
        fontSize: 11,
        color: C.inkFaint,
      }}
    >
      チャートを読み込み中…
    </div>
  );
}

export default function FlavorRadar({ data, height = 210, color }) {
  return (
    <Suspense fallback={<Placeholder height={height} />}>
      <Chart data={data} height={height} color={color} />
    </Suspense>
  );
}

export function Loader() {
  return (
    <div
      className="orbital-loader"
      role="status"
      aria-label="Loading study data"
    >
      <div className="orbital-loader__frame" aria-hidden="true">
        <svg
          viewBox="0 0 300 300"
          className="orbital-loader__layer orbital-loader__layer--outer"
        >
          <circle
            cx="150"
            cy="150"
            r="100"
            className="orbital-loader__outline"
          />
          <circle cx="150" cy="150" r="34" className="orbital-loader__cutout" />
        </svg>
        <svg
          viewBox="0 0 300 300"
          className="orbital-loader__layer orbital-loader__layer--segments"
        >
          <circle
            cx="150"
            cy="150"
            r="91"
            className="orbital-loader__segment orbital-loader__segment--one"
          />
          <circle
            cx="150"
            cy="150"
            r="91"
            className="orbital-loader__segment orbital-loader__segment--two"
          />
          <circle
            cx="150"
            cy="150"
            r="91"
            className="orbital-loader__segment orbital-loader__segment--three"
          />
        </svg>
        <svg
          viewBox="0 0 300 300"
          className="orbital-loader__layer orbital-loader__layer--inner"
        >
          <path
            d="M225 150a75 75 0 1 1-24-55"
            className="orbital-loader__arc"
          />
          <path
            d="M75 150a75 75 0 0 1 24-55"
            className="orbital-loader__arc orbital-loader__arc--reverse"
          />
        </svg>
        <svg
          viewBox="0 0 300 300"
          className="orbital-loader__layer orbital-loader__layer--core"
        >
          <path
            d="M150 78a72 72 0 0 1 64 39"
            className="orbital-loader__arc orbital-loader__arc--yellow"
          />
          <path
            d="M150 222a72 72 0 0 1-64-39"
            className="orbital-loader__arc orbital-loader__arc--yellow"
          />
        </svg>
        <svg
          viewBox="0 0 300 300"
          className="orbital-loader__layer orbital-loader__layer--center"
        >
          <circle
            cx="150"
            cy="150"
            r="18"
            className="orbital-loader__center-ring"
          />
          <circle
            cx="150"
            cy="150"
            r="6"
            className="orbital-loader__center-dot"
          />
        </svg>
      </div>
      <span className="sr-only">Loading study data...</span>
    </div>
  );
}

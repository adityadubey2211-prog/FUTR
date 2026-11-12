
import "./Loader.css";

function Loader() {
  return (
    <div className="loader-container">
      <div className="loader-wrapper">
        <div className="loader-ring">
          <div className="loader-inner"></div>
        </div>

        <div className="loader-core">F</div>
      </div>

      <div className="loader-brand">FUTR</div>

      <p className="loader-text">
        Preparing your future
        <span className="loader-dots">...</span>
      </p>

      <div className="loader-progress">
        <div className="loader-progress-bar"></div>
      </div>
    </div>
  );
}

export default Loader;

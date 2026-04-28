// ============================================================
// MiniHoverPopup.jsx – Kleiner Tooltip beim Hover über Skigebiet
//
// Zeigt nur den Namen des Skigebiets, ohne weitere Daten.
// ============================================================

import { Popup } from "react-map-gl/maplibre";
import "./MiniHoverPopup.css";

export const MiniHoverPopup = ({ hoverMarker }) => {
  return (
    <Popup
      longitude={hoverMarker.lng}
      latitude={hoverMarker.lat}
      closeButton={false}
      closeOnClick={false}
      anchor="bottom"
      offset={14}
      maxWidth="280px"
    >
      <div className="popup-mini">
        <div className="popup-mini-dot" />
        <span className="popup-mini-name">{hoverMarker.name}</span>
      </div>
    </Popup>
  );
};

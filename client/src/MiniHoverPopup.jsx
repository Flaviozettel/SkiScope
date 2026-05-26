// Kleiner Tooltip beim Hover über ein Skigebiet.
// Zeigt nur den Namen – die richtigen Daten kommen erst beim Klick.

import { Popup } from "react-map-gl/maplibre";
import "./MiniHoverPopup.css";

export const MiniHoverPopup = ({ hoverMarker }) => {
  return (
    <Popup
      longitude={hoverMarker.lng}
      latitude={hoverMarker.lat}
      closeButton={false}     // kein X – verschwindet beim Mouseleave
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

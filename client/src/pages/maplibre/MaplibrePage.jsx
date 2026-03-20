import "./MaplibrePage.css";
import { useState } from "react";
import MaplibreMap from "./MaplibreMap.jsx";
import FeatureTable from "../shared_components/FeatureTable.jsx";

// load data
const kantone = await fetch("/kantone.geojson").then((res) => res.json());

function MaplibrePage() {
  const [selectedFeatureID, setSelectedFeatureID] = useState();
  return (
    <div id="maplibre-content">
      <MaplibreMap
        featureCollection={kantone}
        selectedFeatureID={selectedFeatureID}
        setSelectedFeatureID={setSelectedFeatureID}
      />
      <FeatureTable
        features={kantone.features}
        selectedFeatureID={selectedFeatureID}
        setSelectedFeatureID={setSelectedFeatureID}
      />
    </div>
  );
}
export default MaplibrePage;

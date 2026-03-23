import "./OpenlayersPage.css";
import { useState } from "react";
import OpenlayersMap from "./OpenlayersMap.jsx";
import FeatureTable from "../shared_components/FeatureTable.jsx";

// load data
const kantone = await fetch("/kantone.geojson").then((res) => res.json());

function OpenlayersPage() {
  const [selectedFeatureID, setSelectedFeatureID] = useState();
  return (
    <div id="openlayers-content">
      <OpenlayersMap
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
export default OpenlayersPage;

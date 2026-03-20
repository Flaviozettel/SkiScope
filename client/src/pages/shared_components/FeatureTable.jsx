import { useMemo } from "react";
import "./FeatureTable.css";
import { DataGrid } from "@mui/x-data-grid";

const columns = [
  { field: "id", type: "number", headerName: "ID" },
  { field: "name", headerName: "Name", width: 120 },
  { field: "einwohnerzahl", headerName: "Einwohnerzahl", width: 170 },
  { field: "flaeche", headerName: "Fläche in ha", width: 160 },
];

function FeatureTable({ features, selectedFeatureID, setSelectedFeatureID }) {
  let data = useMemo(() => {
    return features.map((i) => {
      return {
        id: i.id,
        name: i.properties.name,
        einwohnerzahl: i.properties.einwohnerzahl,
        flaeche: i.properties.kantonsflaeche,
      };
    });
  }, [features]);

  return (
    <div id="featuretable">
      <DataGrid
        rows={data}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 5, page: 0 },
          },
        }}
        pageSizeOptions={[5]}
        keepNonExistentRowsSelected
        filterModel={{ items: [{ field: "id", operator: "=", value: selectedFeatureID }] }}
        rowSelectionModel={selectedFeatureID === undefined ? [] : [selectedFeatureID]}
        sortModel={[{ field: "id", sort: "asc" }]}
        onRowSelectionModelChange={(selectionModel) => {
          if (selectionModel.length === 0) {
            setSelectedFeatureID(undefined);
          } else {
            setSelectedFeatureID(selectionModel[0]);
          }
        }}
      />
    </div>
  );
}

export default FeatureTable;

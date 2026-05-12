---
layout: default
title: Client
---

Der Client vereint die Komponenten der Kartenvisualisierung und Funktionalitäten von SkiScope zu einer interaktiven und benutzerfreundlichen Weboberfläche.

Die Struktur des Clients basiert auf einer React-/Vite-Anwendung und gliedert sich in folgende zentrale Verzeichnisse und Konfigurationsdateien:

    client/
    ├── public/
    ├── src/
    ├── index.html
    ├── package.json
    └── vite.config.js

Der Ordner src/ bildet den zentralen Bestandsteiil der Anwendung und enthält den Quellcode des Clients.

Im Folgenden werden die im Ordner src/ enthaltenen Konfigurationsdateien (.js), React-Komponenten (.jsx) sowie die zugehörigen Stylesheets (.css) vorgestellt.

---

### Konfigurationsdateien (.js)

Die Dateien `client/src/config.js` und `client/src/mapConfig.js` enthalten zentrale Konfigurationsparameter sowie Hilfsfunktionen der Anwendung. Dazu gehören insbesondere API- und GeoServer-URLs, Kartenstile, Wetterdefinitionen, Kartenbegrenzungen sowie Legenden für die Visualisierung von Schneehöhen. Zusätzlich werden Funktionen wie `geoserverTileUrl()` bereitgestellt, um dynamisch URL-Vorlagen für GeoServer-Vector-Tile-Layer zu erzeugen und diese in der MapLibre-Karte einzubinden.

---

### React-Komponenten (`.jsx`)

#### Header-Bar

`client/src/Header.jsx`

Die Header-Komponente bildet den oberen Einstiegsbereich der Anwendung. Sie enthält das SkiScope-Logo, die Suchfunktion für Skigebiete sowie zusätzliche Anzeigeelemente wie die maximale Schneehöhe oder die Logos der Anwendung.

Die wohl wichtigste Funktion des Headers ist die integrierte Suchfunktion:
Jedes Mal, wenn der Nutzer in das Suchfeld tippt, wird die Funktion handleSearch mit dem aktuellen Eingabewert aufgerufen. Ein Such-Timer sorgt dafür, dass nicht bei jedem einzelnen Tastendruck sofort eine neue Suche ausgeführt wird.

Bei der Suche nach einem Skigebiet werden sowohl der Eingabewert als auch die aus dem Backend empfangenen Skigebietnamen in Kleinbuchstaben umgewandelt. Dadurch wird die Gross- und Kleinschreibung ignoriert. Das heisst, ZERMATT wird zu zermatt.

Anschliessend wird geprüft, ob der eingegebene Suchtext in einem der geladenen Skigebietnamen enthalten ist.

Falls passende Skigebietnamen gefunden werden, werden diese als Suchresultate im Dropdown angezeigt. Dabei werden maximal sechs Resultate ausgegeben.

Zusätzlich wird im Dropdown angezeigt, ob ein Skigebiet offene Lifte hat. Über den Filter Nur geöffnete kann die Suche optional auf Skigebiete eingeschränkt werden, bei denen mindestens ein Lift offen ist.

Wird ein Skigebiet ausgewählt, erfolgt über ein onClick-Event eine Geoserveranfrage, die die entsprechenden Koordinaten des Skigebiets abgreifen, womit ein automatischer Zoom auf die entsprechende Position innerhalb der interaktiven MapLibre-Karte in `client/src/SkiMap.jsx` erfolgen kann.

#### Hauptbereich

`client/src/MainArea.jsx`

Die Datei MainArea.jsx bildet den zentralen Bereich der Anwendung. Sie verbindet und strukturiert die wichtigsten Teilkomponenten, insbesondere die Wetter-Sidebar, die interaktive Skikarte, die Skigebietsdetailansicht sowie die Wetterdetailansicht eines einzelnen Tages.

Die Logik der Komponente basiert hauptsächlich auf bedingter Darstellung. Solange keine detailStationId vorhanden ist, wird die Komponente SkiMap.jsx angezeigt. Wird jedoch über onOpenDetail() eine Stations-ID übergeben, speichert MainArea.jsx diese ID in detailStationId und rendert daraufhin die Komponente SkigebietDetail.jsx. Über onBack() wird detailStationId wieder auf null gesetzt, wodurch die Anwendung zurück zur normalen Kartenansicht wechselt.

#### Kartenbereich

`client/src/SkiMap.jsx`

Der Quellcode SkiMap.jsx erstellt und steuert die zentrale interaktive Karte von SkiScope.

Beim Laden der Komponente wird eine MapLibre-Karte mit swisstopo-Hintergrundkarte aufgebaut. Gleichzeitig werden Skigebietsdaten aus dem Backend geladen und die offenen Skigebiete gespeichert. Diese Informationen werden genutzt, um Skigebietspunkte auf der Karte farblich darzustellen: offene Skigebiete blau, geschlossene grau, ausgewählte oder berührte Punkte hervorgehoben.

Über GeoServer werden verschiedene Kartenlayer eingebunden, darunter Schneehöhen, Pisten, Lifte und Skigebietspunkte. Die Layer können über ein Bedienfeld ein- und ausgeschaltet werden. Zusätzlich ändert sich die Sichtbarkeit automatisch je nach Zoomstufe: In kleinerem Massstab wird vor allem die Schneekarte gezeigt, bei stärkerem Hineinzoomen werden Pisten und Lifte sichtbar.

Die Karte reagiert auf Benutzerinteraktionen. Bewegt der Benutzer die Maus über ein Skigebiet, wird ein Hover-Popup angezeigt und der Punkt hervorgehoben. Klickt der Benutzer auf ein Skigebiet, wird dieses ausgewählt, die Karte zoomt zum entsprechenden Gebiet, Detaildaten werden über die Backend-API geladen und in einem Popup dargestellt. Gleichzeitig wird das ausgewählte Skigebiet an die Wetteranzeige weitergegeben.

---

### Interaktive Elemente

#### Hover-Popup

`client/src/MiniHoverPopup.jsx`

MiniHoverPopup.jsx zeigt einen kleinen Tooltip, sobald man mit der Maus über ein Skigebiet auf der Karte fährt. Die Komponente erhält über hoverMarker die Koordinaten und den Namen des Skigebiets und platziert dort ein MapLibre-Popup. Im Unterschied zum normalen Skigebiets-Popup werden keine Detaildaten geladen, sondern nur der Name des Skigebiets angezeigt. Das Popup hat keinen Schliessbutton und verschwindet wieder, sobald der Hover-Zustand in SkiMap.jsx zurückgesetzt wird.

#### Skigebiets-Popup

`client/src/SkigebietPopup.jsx`

Die Komponente SkigebietPopup.jsx, in SkiMap.jsx eingebunden, zeigt eine kompakte Informationsbox zu einem ausgewählten Skigebiet direkt auf der MapLibre-Karte an. Die Position des Popups wird über die Koordinaten des ausgewählten Markers (selectedMarker.lng und selectedMarker.lat) bestimmt.

Aus den übergebenen tooltipData werden zentrale Informationen wie Name, Schneehöhe, Pistenkilometer sowie Anzahl geöffneter Lifte ausgelesen. Daraus berechnet die Komponente den aktuellen Liftstatus und stellt diesen mit einem farbigen Status-Badge sowie einem Fortschrittsbalken dar.

Zusätzlich wird die Verteilung der Pisten nach Schwierigkeit als farbiger Balken angezeigt. Im unteren Bereich erscheinen der Zeitpunkt der letzten Aktualisierung sowie optional ein Link zur Lawinengefahr.

Falls noch keine Daten geladen sind, zeigt das Popup einen Ladezustand an. Bei fehlenden oder fehlerhaften Daten wird eine Fehlermeldung ausgegeben. Über den Button Details (SkigebietDetail.jsx) → kann die ausführliche Detailansicht des ausgewählten Skigebiets geöffnet werden.

#### Detailansicht Skigebiet

`client/src/SkigebietDetail.jsx`

Die Komponente SkigebietDetail.jsx zeigt eine ausführliche Ansicht zu einem ausgewählten Skigebiet. Sie wird geöffnet, wenn der Nutzer aus dem Popup oder einer anderen Ansicht in die Detailansicht wechselt. Anhand der übergebenen stationId werden die passenden Detailinformationen aus dem Backend geladen.

Die Ansicht ist in zwei Bereiche aufgeteilt. Links befindet sich eine Info-Card mit den wichtigsten Kennzahlen und weiterführenden Informationen zum Skigebiet. Dazu gehören unter anderem die geöffneten Lifte, geöffnete Pisten, die gesamten Pistenkilometer, Schneehöhen im Tal und auf der Piste sowie Angaben zu Neuschnee.

Zusätzlich werden die Pisten nach Schwierigkeit dargestellt. Die blauen, roten und schwarzen Pisten werden in einem Balken zusammengefasst, sodass schnell erkennbar ist, für welche Fahrniveaus das Skigebiet besonders geeignet ist. Auch die verschiedenen Lifttypen wie Seilbahnen, Sesselbahnen, Skilifte oder Babylifte werden als Übersicht angezeigt.

Neben dem klassischen Skibetrieb enthält die Detailansicht auch Informationen zu weiteren Winteraktivitäten. Dazu gehören Langlauf, Schlitteln und Winterwandern, sofern entsprechende Daten vorhanden sind. Über Links kann der Nutzer ausserdem zur Webseite des Skigebiets oder zur Lawinengefahr wechseln.

Rechts wird eine eigene Karte angezeigt, die direkt auf das ausgewählte Skigebiet ausgerichtet ist. Dafür wird die bbox des Skigebiets verwendet. Die relevanten Kartenlayer wie Schnee, Pisten und Lifte sind dabei bereits aktiviert, damit das Gebiet räumlich genauer betrachtet werden kann.

---

### Zusatzfunktionen

#### Wetter-Anzeige

`client/src/WeatherSidebar.jsx`

WeatherSidebar.jsx zeigt links neben der Karte die Wetterprognose für die aktuell ausgewählte Wetterstation. Die Komponente erhält die Wetterdaten als wetter und stellt jeden Prognosetag als eigene Zeile mit Wettericon, Beschreibung sowie Minimal- und Maximaltemperatur dar. Die Icons und Texte werden über den WMO-Code aus WMO_MAP aus mapConfig.js bestimmt.

Wenn die Maus über eine Zeile fährt, wird diese erweitert und zeigt für die ersten sieben Tage einen Button für detailliertes Wetter. Beim Klick darauf werden aktivDatum und detailTag auf den ausgewählten Tag gesetzt. Dadurch kann MainArea.jsx anschliessend die Komponente WeatherDayDetail.jsx als Detailansicht einblenden.

`client/src/WeatherDayDetail.jsx`

WeatherDayDetail.jsx zeigt die Detailansicht für das Wetter eines ausgewählten Tages und einer ausgewählten Wetterstation. Sobald tag und station.station_id vorhanden sind, lädt die Komponente über das Backend die stündlichen Wetterdaten für diesen Tag. Die Daten werden anschliessend für ein Diagramm aufbereitet, in dem Temperatur, Niederschlag und Sonnenscheindauer dargestellt werden.

Zusätzlich berechnet die Komponente Tagesstatistiken wie minimale und maximale Temperatur, gefühlte Temperatur, Regen- und Schneesumme, maximale Windgeschwindigkeit, Böen, Bewölkung und Sonnenscheindauer. Diese Werte werden in übersichtlichen Abschnitten angezeigt. Über den Schliessbutton wird die Detailansicht wieder ausgeblendet.

#### Footer

`client/src/Footer.jsx`

Der Footer bildet die Fusszeile der Anwendung und enthält allgemeine Projektinformationen wie Copyright, Modulnummer und Autorennamen.

### Stylesheets (`.css`)

Die CSS-Dateien definieren das visuelle Erscheinungsbild der einzelnen Komponenten, zum Beispiel Layout, Abstände, Farben, Hover-Effekte, Popups und Karten-Overlays. Dadurch bleibt die React-Logik von der Gestaltung getrennt, was den Code übersichtlicher und einfacher wartbar macht. Besonders bei der Karte sorgen die CSS-Klassen dafür, dass Sidebars, Legenden, Buttons und Detailfenster korrekt positioniert und benutzerfreundlich dargestellt werden.

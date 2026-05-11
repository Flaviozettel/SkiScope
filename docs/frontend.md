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

### Konfigurationsdateien (.js)

Die Dateien `client/src/config.js` und `client/src/mapConfig.js` enthalten zentrale Konfigurationsparameter sowie Hilfsfunktionen der Anwendung. Dazu gehören insbesondere API- und GeoServer-URLs, Kartenstile, Wetterdefinitionen, Kartenbegrenzungen sowie Legenden für die Visualisierung von Schneehöhen. Zusätzlich werden Funktionen zur dynamischen Erstellung von GeoServer-Layern und zur Konfiguration der MapLibre-Karte bereitgestellt.

### React-Komponenten (`.jsx`)

#### Header-Bar

`client/src/Header.jsx`

Die Header-Komponente bildet den oberen Einstiegsbereich der Anwendung. Sie enthält das SkiScope-Logo, die Suchfunktion für Skigebiete sowie zusätzliche Anzeigeelemente wie die maximale Schneehöhe oder die Logos der Anwendung.

Die wohl wichtigste Funktion des Headers ist die integrierte Suchfunktion. In einem ersten Schritt werden sämtliche Skigebiete automatisch über die Backend-API geladen. Anschliessend werden diese anhand des React-States dynamisch nach Benutzereingabe sowie optional nach dem Betriebsstatus „offen“ gefiltert.

Dabei werden maximal sechs passende Suchtreffer angezeigt. Wird ein Skigebiet ausgewählt, erfolgt über ein onClick-Event eine Geoserveranfrage, die die entsprechenden Koordinaten des Skigebiets abgreifen, womit ein automatischer Zoom auf die entsprechende Position innerhalb der interaktiven MapLibre-Karte in `client/src/SkiMap.jsx` erfolgen kann.

#### Hauptbereich

`client/src/MainArea.jsx`

Der Hauptbereich strukturiert die zentrale Benutzeroberfläche der Anwendung. Er verbindet die Kartenansicht mit weiteren Anzeige- und Interaktionselementen.

#### Kartenbereich

`client/src/SkiMap.jsx`

Der Quellcode SkiMap.jsx erstellt und steuert die zentrale interaktive Karte von SkiScope.

Beim Laden der Komponente wird eine MapLibre-Karte mit swisstopo-Hintergrundkarte aufgebaut. Gleichzeitig werden Skigebietsdaten aus dem Backend geladen und die offenen Skigebiete gespeichert. Diese Informationen werden genutzt, um Skigebietspunkte auf der Karte farblich darzustellen: offene Skigebiete blau, geschlossene grau, ausgewählte oder berührte Punkte hervorgehoben.

Über GeoServer werden verschiedene Kartenlayer eingebunden, darunter Schneehöhen, Pisten, Lifte und Skigebietspunkte. Die Layer können über ein Bedienfeld ein- und ausgeschaltet werden. Zusätzlich ändert sich die Sichtbarkeit automatisch je nach Zoomstufe: In kleinerem Massstab wird vor allem die Schneekarte gezeigt, bei stärkerem Hineinzoomen werden Pisten und Lifte sichtbar.

Die Karte reagiert auf Benutzerinteraktionen. Bewegt der Benutzer die Maus über ein Skigebiet, wird ein Hover-Popup angezeigt und der Punkt hervorgehoben. Klickt der Benutzer auf ein Skigebiet, wird dieses ausgewählt, die Karte zoomt zum entsprechenden Gebiet, Detaildaten werden über die Backend-API geladen und in einem Popup dargestellt. Gleichzeitig wird das ausgewählte Skigebiet an die Wetteranzeige weitergegeben.

### Interaktive Elemente

#### Hover-Popup

`client/src/MiniHoverPopup.jsx`

Das Hover-Popup zeigt kompakte Informationen zu einem Skigebiet an, sobald der Benutzer mit der Maus über ein entsprechendes Objekt fährt.

#### Skigebiets-Popup

`client/src/SkigebietPopup.jsx`

Das Skigebiets-Popup zeigt detailliertere Informationen zu einem ausgewählten Skigebiet direkt in der Kartenansicht an.

#### Detailansicht

`client/src/SkigebietDetail.jsx`

Die Detailansicht stellt umfassende Informationen zu einem ausgewählten Skigebiet bereit, beispielsweise Angaben zu Liften, Schneehöhe, Wetterdaten und weiteren Eigenschaften.

---

### Zusatzfunktionen

#### Wetter-Anzeige

`client/src/WeatherSidebar.jsx`

`client/src/WeatherDayDetail.jsx`

Die Wetter-Anzeige stellt aktuelle und prognostizierte Wetterinformationen dar. Die Sidebar gibt eine Übersicht über mehrere Tage, während die Tagesdetailansicht genauere Wetterwerte zu einem ausgewählten Tag zeigt.

#### Footer

`client/src/Footer.jsx`

Der Footer bildet die Fusszeile der Anwendung und enthält allgemeine Projektinformationen wie Copyright, Modulnummer und Autorennamen.

### Stylesheets (`.css`)

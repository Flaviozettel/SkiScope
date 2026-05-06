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

### React-Komponenten (`.jsx`) und Stylesheets (`.css`)

#### Header-Bar

`client/src/Header.jsx`  
`client/src/Header.css`

Die Header-Komponente bildet den oberen Einstiegsbereich der Anwendung. Sie enthält das SkiScope-Logo, die Suchfunktion für Skigebiete sowie zusätzliche Anzeigeelemente wie die maximale Schneehöhe oder die Logos der Anwendung.

Die wichtigste Funktion im Header ist die Suchfunktion, welche in einem ersten Schritt automatisch alle Skigebiete im Backend abfragt. Diese werden anhand des "Use-States" im Suchfenster gefiltert nach Eingabe und Betriebsstatus "offen". Dabei wird eine Auswahl von maximal 6 Treffern angezeigt, wobei bei "OnKlick" auf das Skigebiet in der Karte `client/src/SkiMap.jsx` gezommt wird.



#### Hauptbereich

`client/src/MainArea.jsx`  
`client/src/MainArea.css`

Der Hauptbereich strukturiert die zentrale Benutzeroberfläche der Anwendung. Er verbindet die Kartenansicht mit weiteren Anzeige- und Interaktionselementen.

#### Kartenbereich

`client/src/SkiMap.jsx`  
`client/src/SkiMap.css`

Der Kartenbereich stellt die interaktive MapLibre-Karte dar. Hier werden Skigebiete, GeoServer-Layer, Schneehöhen und weitere räumliche Informationen visualisiert.

---

### Interaktive Elemente

#### Hover-Popup

`client/src/MiniHoverPopup.jsx`  
`client/src/MiniHoverPopup.css`

Das Hover-Popup zeigt kompakte Informationen zu einem Skigebiet an, sobald der Benutzer mit der Maus über ein entsprechendes Objekt fährt.

#### Skigebiets-Popup

`client/src/SkigebietPopup.jsx`  
`client/src/SkigebietPopup.css`

Das Skigebiets-Popup zeigt detailliertere Informationen zu einem ausgewählten Skigebiet direkt in der Kartenansicht an.

#### Detailansicht

`client/src/SkigebietDetail.jsx`  
`client/src/SkigebietDetail.css`

Die Detailansicht stellt umfassende Informationen zu einem ausgewählten Skigebiet bereit, beispielsweise Angaben zu Liften, Schneehöhe, Wetterdaten und weiteren Eigenschaften.

---

### Zusatzfunktionen

#### Wetter-Anzeige

`client/src/WeatherSidebar.jsx`  
`client/src/WeatherSidebar.css`

`client/src/WeatherDayDetail.jsx`  
`client/src/WeatherDayDetail.css`

Die Wetter-Anzeige stellt aktuelle und prognostizierte Wetterinformationen dar. Die Sidebar gibt eine Übersicht über mehrere Tage, während die Tagesdetailansicht genauere Wetterwerte zu einem ausgewählten Tag zeigt.

#### Footer

`client/src/Footer.jsx`  
`client/src/Footer.css`

Der Footer bildet die Fusszeile der Anwendung und enthält allgemeine Projektinformationen wie Copyright, Modulnummer und Autorennamen.

---

### Konfiguration (`.js`)

`client/src/config.js`  
`client/src/mapConfig.js`

Die Datei `config.js` definiert zentrale Verbindungsparameter der Anwendung. Dazu gehören beispielsweise die Backend-API zur Abfrage von Skigebiets- und Wetterdaten sowie die GeoServer-Dienste zur Bereitstellung von Karten- und Geodaten.

Die Datei `mapConfig.js` enthält verschiedene Karten- und Visualisierungskonfigurationen. Beispielsweise wird darin die swisstopo-Hintergrundkarte definiert, Wettercodes werden Symbolen und Beschreibungen zugeordnet und Legendenwerte für Schneehöhen festgelegt.
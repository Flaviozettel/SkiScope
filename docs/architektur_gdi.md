---
layout: default
title: Architektur GDI
---

# Architektur GDI

Die GDI-Architektur von SkiScope beschreibt den technischen Aufbau der Anwendung und zeigt, wie Client, Server, Schnittstellen und eingesetzte Technologien zusammenarbeiten. Sie bildet die Grundlage dafür, dass Geodaten, Wetterinformationen und Skigebietsdaten strukturiert verarbeitet, bereitgestellt und in der Webanwendung dargestellt werden können.

<img src="assets/gifs/Stack.svg" alt="Architekturaufbau" class="svg">

## Client {#client}

{% include_relative 11_frontend.md %}

---

## Server {#server}

{% include_relative 12_backend.md %}

---

## API and Interfaces {#api_and_interfaces}

{% include_relative 13_api_and_interfaces.md %}

---

## Libraries and Technologies {#libraries_and_technologies}

{% include_relative 14_libraries_and_technologies.md %}

Jedes Mal,, wenn der Nutzer in das Suchfeld tippt, wird die Funktion 'handleSearch' mit dem akutellen Wert darin aufgerufen. Ein Such-Timer sorgt dafür, dass nicht bei jedem einzelnen Tastendruck eine neue Suche gestartet wird.

Bei der Suche nach dem Skigebiet, werden der Eingabewert, sowie die aus dem Backend empfangneen Skigebietnamen so umgewandelt, dass die Gross-/kleinschreibung ignoriert wird. Heisst, ZERMATT wird zu zermatt.

Im Anschliessenden Schritt wird geprüft, ob der Suchtext in den angefragten Skigebietnahmen enthalten ist.

Sofern es Skigebitnamen gibt, die den Suchtext enthalten, wird ein Resultat, aber maximal 6 angezeigt.

Nebst der Anzeige der offenen Skilifte im Dropdown, kann optional der Suche die Filterung "nur geöffnete" Lifte darstellen.

<img src="assets/gifs/Search_Skigebiet.gif" alt="" class="gifs">

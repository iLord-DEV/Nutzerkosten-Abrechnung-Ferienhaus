-- AlterTable
ALTER TABLE `TerminAbstimmung` MODIFY `kommentar` TEXT NULL;

-- AlterTable
ALTER TABLE `TerminAenderung` MODIFY `grund` TEXT NULL;

-- AlterTable
ALTER TABLE `TerminKommentar` MODIFY `inhalt` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `TerminPlanung` MODIFY `titel` VARCHAR(500) NOT NULL,
    MODIFY `beschreibung` TEXT NULL;

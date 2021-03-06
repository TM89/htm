package nl.htm.importer
package heffac

import org.apache.poi.ss.usermodel.WorkbookFactory
import java.io.InputStream

object HeffacImporter extends Importer[InputStreamSettings] {

  val tournamentNames = List(
    "feder" -> ("Feder", "FED"),
    "nylon" -> ("Langzwaard Nylon", "LN"),
    "melee" -> ("Melee Games", "MEL"))

  lazy val clubCode2Name = Map(readTuplesFromFile("clubcodes"): _*)

  lazy val clubName2Code = clubCode2Name.map { case (c, n) => (n, c) }

  lazy val replacements = Map(readTuplesFromFile("clubreplacements").map { case (o, r) => (o.toLowerCase(), r) }: _*)

  val tournaments = tournamentNames.map { case (id, (name, mnemonic)) => Tournament(id, name, mnemonic, "heffac-2013-default") }

  def doImport(s: InputStreamSettings): EventData = {
    val workbook = WorkbookFactory.create(s.in)

    val sheet = workbook.getSheetAt(0)

    val headerRow = sheet.getRow(0)

    val headers = Map((for (i <- 0 to (headerRow.getLastCellNum() - 1)) yield headerRow.getCell(i).getStringCellValue() -> i): _*)

    val participantSubscriptions: List[(Participant, List[Tournament])] = (for (i <- 1 to (sheet.getLastRowNum() - 1)) yield {
      val row = sheet.getRow(i)
      if (row.getCell(headers("voornaam")) != null) {
        val index = row.getCell(headers("aantal")).getNumericCellValue().toInt.toString
        val voornaam = row.getCell(headers("voornaam")).getStringCellValue()
        val achternaam = row.getCell(headers("achternaam")).getStringCellValue()
        val clubRaw = row.getCell(headers("ben je lid van een HEMA vereniging?")).getStringCellValue()
        val club = replacements.get(clubRaw.toLowerCase()).getOrElse(clubRaw)
        val clubCode = clubName2Code.get(club).getOrElse("")
        val country = if (List("SUSO", "SWARTA", "HABA") contains clubCode) "BE" else "NL"
        val deelname = row.getCell(headers("waar wil je aan deelnemern")).getStringCellValue().toLowerCase()
        (Some(Participant(
          List(SourceId("heffac", index)),
          voornaam + " " + achternaam,
          voornaam.take(1) + ". " + achternaam,
          club,
          clubCode,
          country,
          "")),
          tournaments.filter(t => deelname.contains(t.id)))
      } else {
        (None, List[Tournament]())
      }
    }).toList.filter(_._1.isDefined).map(t => (t._1.get, t._2))

    EventData(
      2,
      participantSubscriptions.map(_._1),
      tournaments,
      tournaments.map(t => t -> participantSubscriptions.filter(_._2.contains(t)).map { case (p, _) => Subscription(true, p.sourceIds.head.id.toInt, 0) -> p }).toMap)
  }

}
package nl.htm.importer
package swordfish

import nl.htm.importer._
import org.apache.poi.ss.usermodel.WorkbookFactory
import java.io.InputStream
import org.apache.poi.ss.usermodel.Cell
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.ss.usermodel.Sheet

case class SwordfishExcelSettings(in: InputStream, countries: List[(String, String)])

object Swordfish2013ExcelImporter extends Importer[SwordfishExcelSettings] {

  def doImport(settings: SwordfishExcelSettings): EventData = {
    val workbook = WorkbookFactory.create(settings.in)

    val total = workbook.getSheet("Total")

    val headerRow = total.getRow(0)

    val header = Map((for (i <- 0 to headerRow.getLastCellNum() - 1) yield (headerRow.getCell(i).getStringCellValue(), i)): _*)

    val tournaments = Swordfish2013Importer.tournamentNames.map { case (id, name) => Tournament(id, name) }
    implicit def cellToString(cell: Cell): String = if (cell == null) "" else cell.getStringCellValue()
    implicit def cellToInt(cell: Cell): Int = cell.getNumericCellValue().toInt

    println(total.getLastRowNum())

    println("Importing participants")
    val participants = for (rowIndex <- 1 to total.getLastRowNum()) yield {
      val row = total.getRow(rowIndex)
      val countryNameRaw = row.getCell(header("Country"))
      val countryName = Swordfish2013Importer.countryReplacements.get(countryNameRaw).getOrElse(countryNameRaw)
      val country = settings.countries.find { case (_, name) => countryName == name }.map(_._1).getOrElse("")
      Participant(
        List(SourceId("swordfish2013", row.getCell(header("ID")).getNumericCellValue().toInt.toString)),
        row.getCell(header("Name")),
        row.getCell(header("Name")),
        row.getCell(header("Club")),
        "",
        country,
        row.getCell(header("T-Shirt")))
    }

    val subscriptions = tournaments.flatMap {
      case t @ Tournament(_, name) =>
        println("Importing tournament " + name)
        val sheet = workbook.getSheet(name)
        if (sheet != null) {
          val poolFighterNumbers = findPoolFighterNumbers(sheet)
          val subscriptions = for (rowIndex <- 2 to sheet.getLastRowNum() if sheet.getRow(rowIndex).getCell(5) != null) yield {
            val row = sheet.getRow(rowIndex)
            val (primary, xp) = Swordfish2013Importer.parseSubscriptionString(row.getCell(5))
            row.getCell(1).getNumericCellValue().toInt.toString -> Subscription(primary, row.getCell(0), xp, poolFighterNumbers.get(row.getCell(0).getNumericCellValue().toInt))
          }
          val myParticipants = subscriptions.flatMap {
            case (id, sub) =>
              participants.find(_.sourceIds.head.id == id) map { p =>
                sub -> p
              }
          }
          Some(t -> myParticipants.toList)
        } else {
          None
        }
    }

    EventData(3, participants.toList, tournaments, subscriptions.toMap)
  }

  def getPoolNumberFromCell(cell: Cell): Option[Int] = cell match {
    case c: Cell if c.getStringCellValue().startsWith("Pool ") =>
      Some(c.getStringCellValue().dropWhile(!_.isDigit).toInt)
    case _ => None
  }

  def findPoolColumns(row: Row, columnIndex: Int, acc: Map[Int, Int] = Map()): Map[Int, Int] = {
    if (columnIndex > row.getLastCellNum()) {
      acc
    } else {
      findPoolColumns(row, columnIndex + 1, getPoolNumberFromCell(row.getCell(columnIndex)).map(poolNr => acc + (poolNr -> columnIndex)).getOrElse(acc))
    }
  }

  def findPoolFighterNumbers(sheet: Sheet): Map[Int, Int] = {
    val poolColumns = findPoolColumns(sheet.getRow(0), 0)
    poolColumns.flatMap {
      case (poolNr, columnIndex) =>
        val options = for (i <- 2 to sheet.getLastRowNum()) yield {
          val row = sheet.getRow(i)
          row.getCell(columnIndex) match {
            case c: Cell => Some(c.getNumericCellValue().toInt -> poolNr)
            case _ => None
          }
        }
        options.flatten.toList
    } toMap
  }

}
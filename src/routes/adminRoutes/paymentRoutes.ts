import { Router } from "express";
import { exportStatementsCSV, exportStatementsPDF, getAllStatements, payMoney, requestAmountQr } from "../../controllers/paymentController";

const router = Router();
router.post("/pay",payMoney)
router.post("/receive",requestAmountQr)
router.get("",getAllStatements)
router.get("/export-csv-statements",exportStatementsCSV)
router.get("/export-pdf-statements",exportStatementsPDF)
export default router;
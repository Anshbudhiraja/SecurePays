import { Router } from "express";
import { addBankAccount, deleteBankAccount, getBankAccounts, updateBankAccount } from "../../controllers/allBankAccountController";

const router = Router();
router.post("/create", addBankAccount);
router.get("/", getBankAccounts);
router.put("/update/:id", updateBankAccount);
router.delete("/delete/:id", deleteBankAccount);

export default router;
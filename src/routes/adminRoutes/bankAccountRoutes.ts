import { Router } from "express";
import { addBankAccount, deleteBankAccount, getAllBankAccountProviders, getBankAccounts, updateBankAccount } from "../../controllers/bankAccountController";

const router = Router();

router.get("/providers",getAllBankAccountProviders)
router.post("/add",addBankAccount)
router.get("",getBankAccounts)
router.delete("/delete/:id",deleteBankAccount)
router.put("/update/:id",updateBankAccount)
export default router;
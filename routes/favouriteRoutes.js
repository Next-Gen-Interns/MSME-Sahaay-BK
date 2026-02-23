import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  addFavourite,
  removeFavourite,
  getMyFavourites,
  getMyFavouritesDetailed
} from "../controllers/favouriteController.js";

const router = express.Router();

router.post("/:listingId", authenticate, addFavourite);
router.delete("/:listingId", authenticate, removeFavourite);
router.get("/my", authenticate, getMyFavourites);
router.get("/detailed", authenticate, getMyFavouritesDetailed);

export default router;
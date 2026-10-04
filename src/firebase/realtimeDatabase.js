import { getDatabase } from "firebase/database";
import app from "./config";

const realtimeDb = getDatabase(app);

export default realtimeDb;
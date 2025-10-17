import "dotenv/config";
import express from "express";
import uploadRoutes from "./api/routes/upload.routes";
import evaluateRoutes from "./api/routes/evaluate.routes";
import resultRoutes from "./api/routes/result.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(uploadRoutes);
app.use(evaluateRoutes);
app.use(resultRoutes);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

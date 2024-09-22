import { Router } from "express"
import { Response, Request} from "express"
import dbConnection from '../db/connection';
import { authMiddleware } from '../middlewares/verifyTokenInHeader';
import { JwtPayload } from 'jsonwebtoken';

const router = Router()



export default router
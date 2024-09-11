import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secretKey = process.env.JWT_SECRET; // Certifique-se de definir JWT_SECRET no seu arquivo .env

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  // console.log('Authorization Header:', authHeader); // Debug

  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    //console.log('Token não fornecido'); // Debug
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    if (!secretKey) {
      throw new Error('JWT_SECRET não está definido');
    }

    const decoded = jwt.verify(token, secretKey);
    req.userAuthenticated = decoded; // Armazena os dados decodificados no objeto de solicitação

    next();
  } catch (error) {
    console.log('Erro ao verificar o token:', error); // Log adicional para depuração
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}
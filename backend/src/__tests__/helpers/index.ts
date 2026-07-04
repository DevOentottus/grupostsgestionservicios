/** Helper: genera hash bcrypt con costo bajo para tests */
import bcrypt from "bcryptjs";
export function hashForTest(password: string): string {
  return bcrypt.hashSync(password, 4);
}

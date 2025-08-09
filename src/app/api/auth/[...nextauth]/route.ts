import NextAuth from "next-auth"
import { authOptions } from "@/lib/core/auth"

// NextAuth v4 in App Router: create a handler and export as GET/POST
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }


 
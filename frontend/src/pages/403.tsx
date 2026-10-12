import { FileQuestion } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router"
import Button from "@/components/ui/button"

function NotAccess() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center gap-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex size-32 items-center justify-center rounded-full bg-muted"
        >
          <FileQuestion className="size-16 text-muted-foreground" />
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-4">
          <h1 className="font-bold text-9xl tracking-tighter">403</h1>
          <p className="text-muted-foreground text-xl">Page not found</p>
          <p className="text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Link to="/">
            <Button size="lg">Go to Home Page</Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default NotAccess

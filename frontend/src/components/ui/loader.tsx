import * as motion from "motion/react-client"

import reactLogo from "@/assets/react.svg"

function Loader() {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 cursor-progress"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: 45 }}
      transition={{
        rotate: {
          repeat: Infinity,
        },
      }}
      whileHover={{ scale: 1.1 }}
    >
      <img src={reactLogo} alt="Loading" />
    </motion.div>
  )
}

export default Loader

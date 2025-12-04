import { motion, type MotionValue, type Variants } from "framer-motion";
import Image from "next/image";

interface HeroImageDisplayProps {
  isMounted: boolean;
  imageY: MotionValue<number>;
  imageOpacity: MotionValue<number>;
  handVariant: Variants;
  flyVariant: Variants;
}

/**
 * A presentational component for the right-side image stack of the hero section.
 */
export const HeroImageDisplay = ({
  isMounted,
  imageY,
  imageOpacity,
  handVariant,
  flyVariant,
}: HeroImageDisplayProps) => {
  return (
    <motion.div
      style={{ y: imageY, opacity: imageOpacity }}
      className="relative order-last flex h-full min-h-[300px] items-end justify-center sm:min-h-[350px] md:order-none md:min-h-[400px] lg:min-h-[550px] xl:min-h-[600px] 2xl:min-h-[650px]"
    >
      {/* Container for the hand image */}
      <div className="absolute bottom-[-95%] left-1/2 w-[145%] max-w-none -translate-x-1/2 sm:bottom-[-100%] sm:w-[155%] md:bottom-[-85%] md:w-[180%] lg:bottom-[-115%] lg:w-[180%] xl:bottom-[-90%] xl:w-[160%] 2xl:bottom-[-80%] 2xl:w-[140%]">
        <motion.div
          className="relative z-10 -rotate-12 transform md:-rotate-15"
          variants={handVariant}
          initial="hidden"
          animate={isMounted ? "show" : "hidden"}
        >
          <Image
            src="/images/hand.png"
            alt="Hand reaching out the fly"
            width={1422}
            height={1800}
            className="h-auto w-full object-contain"
            priority
          />
        </motion.div>

        <motion.div
          className="absolute bottom-[80%] left-[55%] z-20 w-[45%] max-w-md -translate-x-1/2 sm:bottom-[55%] sm:w-[50%] md:bottom-[85%] md:w-[55%] lg:bottom-[85%] lg:w-[45%] xl:bottom-[90%] xl:w-[50%] 2xl:bottom-[90%] 2xl:w-[55%]"
          variants={flyVariant}
          initial="hidden"
          animate={isMounted ? "show" : "hidden"}
        >
          <motion.div
            animate={isMounted ? { y: [0, -10, 0] } : { y: 0 }}
            transition={{
              duration: 3.5,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <Image
              src="/images/chrysomya-megacephala.png"
              alt="Chrysomya Megacephala fly"
              width={698}
              height={465}
              className="h-auto w-full object-contain"
              priority
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

HeroImageDisplay.displayName = "HeroImageDisplay";

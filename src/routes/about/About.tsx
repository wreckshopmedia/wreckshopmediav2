import { RootedPlant } from "../../components/Plant/plantIndex";
import styles from "./about.module.css";

/**
 * @description About page. Content is freely positioned absolute relative to
 * the contentCanvas inside SiteLayout's navAnchor.
 * @author Chris "Mo" Mochinski
 */
export function About() {
  return (
    <>
      {/* a couple plants sprout on route enter (remount = fresh grow). RootedPlant measures
          the real hill curve under each one, so offset is the only placement knob - drop is
          just the fallback if the hill can't be found. */}
      <RootedPlant
        side="left"
        drop={104}
        offset="clamp(2rem, 6vw, 4.5rem)"
        growDuration={1}
        height={0.7}
        size="120px"
        stemWidth={4}
        leafCount={18}
        leafSize={0.8}
        delay={0.7}
      />
      <RootedPlant
        side="left"
        drop={104}
        offset="clamp(3rem, 8vw, 5.5rem)"
        growDuration={1.7}
        height={1.1}
        size="124px"
        stemWidth={3}
        leafCount={26}
        leafSize={0.8}
        delay={0.3}
      />
      <RootedPlant
        side="right"
        drop={104}
        offset="clamp(2rem, 6vw, 4.5rem)"
        delay={1}
        growDuration={1}
        size="140px"
        height={0.8}
        stemWidth={3}
        leafCount={22}
        leafSize={0.8}
      />

      <div className={styles.bioStack}>
        <p>
            <span className={styles.bizName}>Wreck Shop Media</span> was officially founded &
            registered in 2022 by a nerdy dude who tried to trick people he was all rock and roll
            and stuff. Chris "Mo" Mochinski was born in Minneapolis back in the 1900s, and was
            irresponsibly obsessed with technology from day 3,492...like, around the end of
            elementary school. By age 14, he was typing 80+ WPM (formally tested) before high
            school. By age 17, Mo was building rudimentary websites for his band and others.
          </p>
        <p>
            When Mo isn't tearing through code, you may catch him doing something musical, pursuing
            his private pilot's license, or on an adventure with his stepkid. Please also note that
            Mo is the worst basketball player of all time, he loves airports an unprecedented
            amount, and he eats a single slice of peanut butter toast every night before he goes to
            sleep...a thing he finds tragically boring and wouldn't do if his body didn't need it.
            The sleep, not the toast.
          </p>
      </div>
    </>
  );
}

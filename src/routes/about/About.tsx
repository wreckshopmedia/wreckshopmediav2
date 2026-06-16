import clsx from "clsx";
import { Plant } from "../../components/Plant/plantIndex";
import styles from "./about.module.css";

/**
 * @description About page. Content is freely positioned absolute relative to
 * the contentCanvas inside SiteLayout's navAnchor.
 * @author Chris "Mo" Mochinski
 */
export function About() {
  return (
    <>
      {/* POC: a couple plants sprout on route enter (remount = fresh grow) */}
      <div className={styles.plantLeft}>
        <Plant growDuration={0.7} height={0.7} size="120px" stemWidth={2} leafCount={18} leafSize={0.8} />
      </div>
      <div className={styles.plantRight}>
        <Plant
          delay={0.2}
          growDuration={0.9}
          size="140px"
          height={0.8}
          stemWidth={3}
          leafCount={22}
          leafSize={0.8}
        />
      </div>

      <div className={clsx(styles.aboutBlurb, styles.leftBlurb)}>
        <div className={styles.aboutBlurbTextWrapper}>
          <p>
            <span className={styles.bizName}>Wreck Shop Media LLC</span> was officially founded &
            registered in 2022 by a nerdy dude who tried to trick people he was all rock and roll
            and stuff. Chris "Mo" Mochinski was born in Minneapolis back in the 1900s, and was
            irresponsibly obsessed with technology from day 3,492...like, around the end of
            elementary school. By age 14, he was typing 80+ WPM (formally tested) before high
            school. By age 17, Mo was building rudimentary websites for his band and others.
          </p>
        </div>
      </div>
      <div className={clsx(styles.aboutBlurb, styles.rightBlurb)}>
        <div className={styles.aboutBlurbTextWrapper}>
          <p>
            When Mo isn't hunkered down in front of an obnoxious wall of computer monitors, you may
            catch him on the road with his band, writing and tracking original songs for his project
            "Harvestmen", bowling, wandering the streets of Minneapolis, or participating in a
            paranormal investigation. Additionally, please note that Mo is the worst basketball
            player in the world, has an unprecedented amount of love for airports, and eats a single
            slice of peanut butter toast every night before he sleep for 5 hours if he's lucky.
          </p>
        </div>
      </div>
    </>
  );
}

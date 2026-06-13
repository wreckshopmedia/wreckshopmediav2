import styles from "./about.module.css";

/**
 * @description About page. Content is freely positioned absolute relative to
 * the contentCanvas inside SiteLayout's navAnchor.
 * @author Chris "Mo" Mochinski
 */
export function About() {
  return (
    <>
      <div className={styles.aboutBlurb}>
        <div className={styles.aboutBlurbTextWrapper}>
          <p>
            Wreck Shop Media LLC was founded in 2023 by a nerdy dude pretending to be all rock and
            roll and stuff. He has tattoos, hates water, finds sleep to be boring, and is way too
            pumped about way too many technological things.
          </p>

          <p>
            Chris "Mo" Mochinski was born in Minneapolis, MN and was tearing apart computers and
            building networks with his dad at a very young age. He is the worst basketball player in
            the world, and has an unprecedented amount of love for airports.
          </p>
        </div>
      </div>
    </>
  );
}

import styles from './SiteFooter.module.css';

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>© {year} Bruno Guimarães</p>
      </div>
    </footer>
  );
}

export default SiteFooter;

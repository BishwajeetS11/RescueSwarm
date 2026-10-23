import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

export type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  crumbs?: Crumb[];
  badges?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, eyebrow, description, crumbs, badges, actions }: Props) {
  return (
    <header className={styles.header}>
      {crumbs && crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb">
          <ol className={styles.crumbs}>
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`}>
                {crumb.href ? (
                  <a href={crumb.href}>{crumb.label}</a>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className={styles.row}>
        <div className={styles.titleBlock}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.title}>{title}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
          {badges ? <div className={styles.badges}>{badges}</div> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}

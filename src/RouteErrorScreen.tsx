import { Link } from "react-router-dom";

/**
 * The route tree's `errorElement`: what a render error anywhere in a screen becomes, instead of
 * React unmounting everything to a blank page. Deliberately shows nothing about the error itself;
 * React Router has already logged it to the console. It replaces the whole app shell, so it brings
 * its own `home-feed` wrapper.
 */
export function RouteErrorScreen() {
  return (
    <div className="home-feed">
      <section className="home-section">
        <h1 className="home-section__heading">Something went wrong</h1>
        <p className="home-section__placeholder">
          This screen couldn't load. Anything you'd already finished is still saved in History.
        </p>
        <Link className="button-primary route-error__action" to="/">
          Go to Home
        </Link>
      </section>
    </div>
  );
}

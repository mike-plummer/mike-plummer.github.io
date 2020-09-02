(window.webpackJsonp = window.webpackJsonp || []).push([
  [5],
  {
    151: function (e, t, n) {
      'use strict';
      n.r(t);
      var a = n(7),
        r = n.n(a),
        l = n(0),
        c = n.n(l),
        s = n(4),
        o = n.n(s),
        i = n(169),
        m = n.n(i),
        u = n(168),
        d = n.n(u),
        f = n(273),
        p = function (e) {
          return c.a.createElement(
            'header',
            { id: 'header', className: 'alt' },
            c.a.createElement('span', {
              className: 'style5 icon minor fa-bolt',
            }),
            c.a.createElement('h1', null, 'Mike Plummer'),
            c.a.createElement(
              'p',
              null,
              'Full-stack developer in the heart of flyover country'
            )
          );
        },
        E = (n(48), n(275)),
        h = n.n(E),
        y = (n(334), n(49)),
        g = n.n(y),
        v = n(336),
        N = n.n(v),
        b = function (e) {
          return e.children;
        },
        k = (function (e) {
          function t() {
            var t;
            return (
              ((t = e.call(this) || this).handleClick = t.handleClick.bind(
                g()(g()(t))
              )),
              t
            );
          }
          r()(t, e);
          var n = t.prototype;
          return (
            (n.componentDidMount = function () {
              N.a.polyfill();
            }),
            (n.handleClick = function (e) {
              e.preventDefault();
              var t = 0,
                n = !0,
                a = this.props,
                r = a.type,
                l = a.element,
                c = a.offset,
                s = a.timeout;
              if (r && l)
                switch (r) {
                  case 'class':
                    n = !!(t = document.getElementsByClassName(l)[0]);
                    break;
                  case 'id':
                    n = !!(t = document.getElementById(l));
                }
              n
                ? this.scrollTo(t, c, s)
                : console.log('Element not found: ' + l);
            }),
            (n.scrollTo = function (e, t, n) {
              void 0 === t && (t = 0), void 0 === n && (n = null);
              var a = e
                ? e.getBoundingClientRect().top + window.pageYOffset
                : 0;
              n
                ? setTimeout(function () {
                    window.scroll({ top: a + t, left: 0, behavior: 'smooth' });
                  }, n)
                : window.scroll({ top: a + t, left: 0, behavior: 'smooth' });
            }),
            (n.render = function () {
              return c.a.createElement(
                b,
                null,
                'object' == typeof this.props.children
                  ? c.a.cloneElement(this.props.children, {
                      onClick: this.handleClick,
                    })
                  : c.a.createElement(
                      'span',
                      { onClick: this.handleClick },
                      this.props.children
                    )
              );
            }),
            t
          );
        })(c.a.Component);
      k.propTypes = {
        type: o.a.string,
        element: o.a.string,
        offset: o.a.number,
        timeout: o.a.number,
        children: o.a.node.isRequired,
      };
      var w = k,
        C = function (e) {
          return c.a.createElement(
            'nav',
            { id: 'nav', className: e.sticky ? 'alt' : '' },
            c.a.createElement(
              h.a,
              {
                items: ['intro', 'first', 'second', 'cta'],
                currentClassName: 'is-active',
                offset: -300,
              },
              [
                ['intro', 'About'],
                ['first', 'Skills'],
                ['second', 'Stats'],
                ['third', 'Conferences'],
                ['cta', 'Blog'],
              ].map(function (e) {
                return c.a.createElement(
                  'li',
                  { key: e[0] },
                  c.a.createElement(
                    w,
                    { type: 'id', element: e[0] },
                    c.a.createElement('a', { href: '#' }, e[1])
                  )
                );
              })
            )
          );
        },
        j = n(180),
        S = n(337),
        q = n.n(S),
        R = function (e) {
          return l.createElement(
            'div',
            { className: 'spotlight' },
            l.createElement(
              'div',
              { className: 'content' },
              l.createElement(
                'header',
                { className: 'major' },
                l.createElement('h2', null, 'About Mike')
              ),
              l.createElement('h3', null, 'Hello!'),
              l.createElement('strong', null, 'A little bit about myself'),
              l.createElement(
                'p',
                null,
                "I'm a full-stack developer, dabbling in a bit of everything. Mostly front-end development in React and Angular with a side of Java and JVM languages like Kotlin and Groovy. Graduate of Iowa State and Penn State with about a decade of hobby and professional development under my belt."
              ),
              l.createElement(
                'p',
                null,
                'After a few years out west I’ve returned to my roots in the midwest US and now work as a Principal Technologist at ',
                l.createElement(
                  'a',
                  {
                    href: 'https://objectpartners.com',
                    rel: 'noopener noreferrer',
                  },
                  'Object Partners'
                ),
                ' in Omaha, Nebraska.'
              )
            ),
            l.createElement(
              'span',
              { className: 'image' },
              l.createElement('img', { src: q.a, alt: '' })
            )
          );
        },
        T = function (e) {
          return l.createElement(
            l.Fragment,
            null,
            l.createElement(
              'header',
              { className: 'major' },
              l.createElement('h2', null, 'Stats'),
              l.createElement('p', null, 'My life, reduced to numbers')
            ),
            l.createElement(
              'ul',
              { className: 'statistics' },
              l.createElement(
                'li',
                { className: 'style1' },
                l.createElement('span', { className: 'icon fa-calendar' }),
                l.createElement('strong', null, '10'),
                ' Years Experience'
              ),
              l.createElement(
                'li',
                { className: 'style2' },
                l.createElement('span', { className: 'icon fa-code-fork' }),
                l.createElement('strong', null, '> 10000'),
                ' Commits'
              ),
              l.createElement(
                'li',
                { className: 'style3' },
                l.createElement('span', { className: 'icon fa-building' }),
                l.createElement('strong', null, '4'),
                ' Clients'
              ),
              l.createElement(
                'li',
                { className: 'style4' },
                l.createElement('span', { className: 'icon fa-briefcase' }),
                l.createElement('strong', null, '8'),
                ' Projects'
              ),
              l.createElement(
                'li',
                { className: 'style5' },
                l.createElement('span', { className: 'icon fa-github' }),
                l.createElement('strong', null, '36'),
                ' Repositories'
              ),
              l.createElement(
                'li',
                { className: 'style6' },
                l.createElement('span', { className: 'icon fa-comment' }),
                l.createElement('strong', null, '9'),
                ' Conference Talks'
              )
            )
          );
        },
        M = n(152),
        P = n.n(M),
        x = function (e) {
          return l.createElement(
            'div',
            { className: 'content' },
            l.createElement(
              'header',
              { className: 'major' },
              l.createElement('h2', null, 'Blog')
            ),
            l.createElement(
              'p',
              null,
              'Read the latest of my (infrequent) blog posts'
            ),
            l.createElement(
              'footer',
              { className: 'major' },
              l.createElement(
                'ul',
                { className: 'actions' },
                l.createElement(
                  'li',
                  null,
                  l.createElement(
                    P.a,
                    { to: './blog', className: 'button special' },
                    'Read More'
                  )
                )
              )
            )
          );
        },
        I =
          (n(179),
          function (e) {
            return l.createElement(
              l.Fragment,
              null,
              l.createElement(
                'header',
                { className: 'major' },
                l.createElement('h2', null, 'What I do')
              ),
              l.createElement(
                'ul',
                { className: 'features' },
                e.skills
                  .map(function (e) {
                    return e.node;
                  })
                  .map(function (e) {
                    return l.createElement(
                      'li',
                      { key: e.frontmatter.name },
                      l.createElement('span', {
                        className: 'icon major style5 ' + e.frontmatter.icon,
                      }),
                      l.createElement('h3', null, e.frontmatter.name),
                      l.createElement('p', null, e.frontmatter.brief)
                    );
                  })
              ),
              l.createElement(
                'footer',
                { className: 'major' },
                l.createElement(
                  'ul',
                  { className: 'actions' },
                  l.createElement(
                    'li',
                    null,
                    l.createElement(
                      P.a,
                      { to: './skills', className: 'button' },
                      'Learn More'
                    )
                  )
                )
              )
            );
          }),
        L = function (e) {
          return l.createElement(
            l.Fragment,
            null,
            l.createElement(
              'header',
              { className: 'major' },
              l.createElement('h2', null, 'Conferences'),
              l.createElement('p', null, 'Conferences I have spoken at')
            ),
            l.createElement(
              'ul',
              { className: 'features' },
              e.conferences
                .map(function (e) {
                  return e.node;
                })
                .map(function (e) {
                  return l.createElement(
                    'li',
                    { key: e.frontmatter.order },
                    l.createElement('span', {
                      className: 'icon major style5 ' + e.frontmatter.icon,
                    }),
                    l.createElement('h3', null, e.frontmatter.name),
                    l.createElement('div', {
                      dangerouslySetInnerHTML: { __html: e.html },
                    })
                  );
                })
            )
          );
        };
      n.d(t, 'pageQuery', function () {
        return _;
      });
      var G = (function (e) {
        function t(t) {
          var n;
          return (
            ((n = e.call(this, t) || this)._handleWaypointEnter = function () {
              n.setState(function () {
                return { stickyNav: !1 };
              });
            }),
            (n._handleWaypointLeave = function () {
              n.setState(function () {
                return { stickyNav: !0 };
              });
            }),
            (n.state = { stickyNav: !1 }),
            n
          );
        }
        return (
          r()(t, e),
          (t.prototype.render = function () {
            var e = this.props.data;
            return c.a.createElement(
              j.a,
              null,
              c.a.createElement(d.a, {
                title: m()(this, 'props.data.site.siteMetadata.title'),
              }),
              c.a.createElement(p, null),
              c.a.createElement(f.a, {
                onEnter: this._handleWaypointEnter,
                onLeave: this._handleWaypointLeave,
              }),
              c.a.createElement(C, { sticky: this.state.stickyNav }),
              c.a.createElement(
                'div',
                { id: 'main' },
                c.a.createElement(
                  'section',
                  { id: 'intro', className: 'main' },
                  c.a.createElement(R, null)
                ),
                c.a.createElement(
                  'section',
                  { id: 'first', className: 'main special' },
                  c.a.createElement(I, { skills: e.skills.edges })
                ),
                c.a.createElement(
                  'section',
                  { id: 'second', className: 'main special' },
                  c.a.createElement(T, null)
                ),
                c.a.createElement(
                  'section',
                  { id: 'third', className: 'main special' },
                  c.a.createElement(L, { conferences: e.conferences.edges })
                ),
                c.a.createElement(
                  'section',
                  { id: 'cta', className: 'main special' },
                  c.a.createElement(x, null)
                )
              )
            );
          }),
          t
        );
      })(c.a.Component);
      G.propTypes = { route: o.a.object };
      t.default = G;
      var _ = '44477429';
    },
    167: function (e, t, n) {
      var a;
      e.exports = ((a = n(201)) && a.default) || a;
    },
    178: function (e, t, n) {
      'use strict';
      n.r(t),
        n.d(t, 'graphql', function () {
          return p;
        }),
        n.d(t, 'StaticQueryContext', function () {
          return d;
        }),
        n.d(t, 'StaticQuery', function () {
          return f;
        });
      var a = n(0),
        r = n.n(a),
        l = n(4),
        c = n.n(l),
        s = n(152),
        o = n.n(s);
      n.d(t, 'Link', function () {
        return o.a;
      }),
        n.d(t, 'withPrefix', function () {
          return s.withPrefix;
        }),
        n.d(t, 'navigate', function () {
          return s.navigate;
        }),
        n.d(t, 'push', function () {
          return s.push;
        }),
        n.d(t, 'replace', function () {
          return s.replace;
        }),
        n.d(t, 'navigateTo', function () {
          return s.navigateTo;
        });
      var i = n(167),
        m = n.n(i);
      n.d(t, 'PageRenderer', function () {
        return m.a;
      });
      var u = n(36);
      n.d(t, 'parsePath', function () {
        return u.a;
      });
      var d = r.a.createContext({}),
        f = function (e) {
          return r.a.createElement(d.Consumer, null, function (t) {
            return e.data || (t[e.query] && t[e.query].data)
              ? (e.render || e.children)(e.data ? e.data.data : t[e.query].data)
              : r.a.createElement('div', null, 'Loading (StaticQuery)');
          });
        };
      function p() {
        throw new Error(
          'It appears like Gatsby is misconfigured. Gatsby related `graphql` calls are supposed to only be evaluated at compile time, and then compiled away,. Unfortunately, something went wrong and the query was left in the compiled code.\n\n.Unless your site has a complex or custom babel/Gatsby configuration this is likely a bug in Gatsby.'
        );
      }
      f.propTypes = {
        data: c.a.object,
        query: c.a.string.isRequired,
        render: c.a.func,
        children: c.a.func,
      };
    },
    201: function (e, t, n) {
      'use strict';
      n.r(t);
      n(35);
      var a = n(0),
        r = n.n(a),
        l = n(4),
        c = n.n(l),
        s = n(52),
        o = n(2),
        i = function (e) {
          var t = e.location,
            n = o.default.getResourcesForPathnameSync(t.pathname);
          return r.a.createElement(
            s.a,
            Object.assign({ location: t, pageResources: n }, n.json)
          );
        };
      (i.propTypes = {
        location: c.a.shape({ pathname: c.a.string.isRequired }).isRequired,
      }),
        (t.default = i);
    },
    337: function (e, t, n) {
      e.exports = n.p + 'static/mike-f62e951fb591fcc38d2f55a3fb34dc1a.png';
    },
  },
]);
//# sourceMappingURL=component---src-pages-index-js-edde192663fdbb24449c.js.map

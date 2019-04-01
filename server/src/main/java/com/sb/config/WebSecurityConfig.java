package com.sb.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

import com.sb.security.auth.AuthenticationFailureHandler;
import com.sb.security.auth.AuthenticationSuccessHandler;
import com.sb.security.auth.LogoutSuccess;
import com.sb.security.auth.RestAuthenticationEntryPoint;
import com.sb.security.auth.TokenAuthenticationFilter;
import com.sb.service.impl.CustomUserDetailsService;

/**
 * Created by fan.jin on 2016-10-19.
 */

@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {

  @Value("${jwt.cookie}")
  private String TOKEN_COOKIE;

  @Bean
  public TokenAuthenticationFilter jwtAuthenticationTokenFilter() throws Exception {
    return new TokenAuthenticationFilter();
  }

  @Bean
  @Override
  public AuthenticationManager authenticationManagerBean() throws Exception {
    return super.authenticationManagerBean();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Autowired
  private CustomUserDetailsService jwtUserDetailsService;

  @Autowired
  private RestAuthenticationEntryPoint restAuthenticationEntryPoint;

  @Autowired
  private LogoutSuccess logoutSuccess;

  @Autowired
  public void configureGlobal(AuthenticationManagerBuilder authenticationManagerBuilder)
      throws Exception {
    authenticationManagerBuilder.userDetailsService(jwtUserDetailsService)
        .passwordEncoder(passwordEncoder());

  }

  @Autowired
  private AuthenticationSuccessHandler authenticationSuccessHandler;

  @Autowired
  private AuthenticationFailureHandler authenticationFailureHandler;
  
  @Autowired
  @Qualifier("persistentTokenRepository")
  private PersistentTokenRepository persistentTokenRepository;
  
  @Override
  protected void configure(HttpSecurity http) throws Exception {
    //http.csrf().disable()
	  http.csrf().ignoringAntMatchers("/h2/**","/api/auth/login", "/api/auth/signup")
      .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()).and()
      .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
      .exceptionHandling().authenticationEntryPoint(restAuthenticationEntryPoint).and()
      .addFilterBefore(jwtAuthenticationTokenFilter(), BasicAuthenticationFilter.class)
      .authorizeRequests()
      .antMatchers("/api/auth/signup",
      		"/api/auth/verifyEmail", 
      		"/api/auth/resendEmailVerification", 
      		"/api/auth/refreshAuthToken",
      		"/api/article/**").permitAll()
      .antMatchers("/api/**").authenticated()
      //.anyRequest().authenticated()
      .and().formLogin().loginPage("/api/auth/login")
      .successHandler(authenticationSuccessHandler).failureHandler(authenticationFailureHandler)
      .and().logout().logoutRequestMatcher(new AntPathRequestMatcher("/api/auth/logout"))
      .logoutSuccessHandler(logoutSuccess).deleteCookies(TOKEN_COOKIE);
	    
	  http.rememberMe()
	  .rememberMeParameter("rememberMe")
	  .rememberMeCookieName("remember-me")
	  .tokenRepository(persistentTokenRepository)
	  .userDetailsService(jwtUserDetailsService);

    //unables h2 db ui
    http.headers().frameOptions().sameOrigin();

  }
	
  @Bean
  public SessionRegistry sessionRegistry() {
      return new SessionRegistryImpl();
  }
  
  @Override
  public void configure(WebSecurity web) throws Exception {
      // TokenAuthenticationFilter will ignore the below paths
      web.ignoring().antMatchers(
              HttpMethod.GET,
              "/*",
              "/assets/**",
              "/webjars/**",
              "/*.html",
              "/favicon.ico",
              "/**/*.html",
              "/**/*.css",
              "/**/*.js"
          );
  }
}
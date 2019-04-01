package com.sb.rest;

import static org.springframework.web.bind.annotation.RequestMethod.GET;
import static org.springframework.web.bind.annotation.RequestMethod.POST;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.sb.dto.UserDto;
import com.sb.dto.UserRequest;
import com.sb.exception.ResourceConflictException;
import com.sb.pojo.User;
import com.sb.security.registration.OnRegistrationCompleteEvent;
import com.sb.service.UserService;
import com.sb.util.GenericResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
public class UserController {
	
  private final Logger LOGGER = LoggerFactory.getLogger(getClass());
	
  @Autowired
  private UserService userService;

  @Autowired
  private ApplicationEventPublisher eventPublisher;

  
  @RequestMapping(value = "/signup", method = RequestMethod.POST)
  @ResponseBody
  public GenericResponse registerUserAccount(@Valid @RequestBody final UserDto accountDto, final HttpServletRequest request) {
      LOGGER.debug("Registering user account with information: {}", accountDto);
      final User registered = userService.registerNewUserAccount(accountDto);
      eventPublisher.publishEvent(new OnRegistrationCompleteEvent(registered, request.getLocale(), getAppUrl(request)));
     return new GenericResponse("success");
  }

  private String getAppUrl(HttpServletRequest request) {
      return "http://" + request.getServerName() + ":" + request.getServerPort() + request.getContextPath();
  }
    
  //from bfwg/angular-spring-starter
  @RequestMapping(method = GET, value = "/user/{userId}")
  public User loadById(@PathVariable Long userId) {
    return this.userService.findById(userId);
  }

  @RequestMapping(method = GET, value = "/user/all")
  public List<User> loadAll() {
    return this.userService.findAll();
  }

  @RequestMapping(method = GET, value = "/user/reset-credentials")
  public ResponseEntity<Map> resetCredentials() {
    this.userService.resetCredentials();
    Map<String, String> result = new HashMap<>();
    result.put("result", "success");
    return ResponseEntity.accepted().body(result);
  }


  /*
  @RequestMapping(method = POST, value = "/signup")
  public ResponseEntity<?> addUser(@RequestBody UserRequest userRequest,
      UriComponentsBuilder ucBuilder) {

    User existUser = this.userService.findByUsername(userRequest.getUsername());
    if (existUser != null) {
      throw new ResourceConflictException(userRequest.getId(), "Username already exists");
    }
    User user = this.userService.save(userRequest);
    //HttpHeaders headers = new HttpHeaders();
    //headers.setLocation(ucBuilder.path("/api/user/{userId}").buildAndExpand(user.getId()).toUri());
    return new ResponseEntity<User>(user, HttpStatus.CREATED);
  }*/
  
  /*
   * We are not using userService.findByUsername here(we could), so it is good that we are making
   * sure that the user has role "ROLE_USER" to access this endpoint.
   */
  
  @RequestMapping("/whoami")
  @PreAuthorize("hasRole('USER')")
  public User user() {
    return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
  }

}